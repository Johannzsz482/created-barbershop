package com.crafted.barbershop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

// A barber's own time off (schedule_exceptions). Barbers only: everyone else gets 403.
// SlotService already blocks bookings on any day covered by APPROVED leave.
@RestController
@RequestMapping("/api/leave")
public class LeaveController {
    private static final String DEFAULT_REASON = "Day off";

    private final JdbcTemplate jdbc;

    public LeaveController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record LeaveBody(String start_date, String end_date, String reason) {}

    private static ResponseEntity<?> notBarber() {
        return Api.err(HttpStatus.FORBIDDEN, "Only barbers can manage time off.");
    }

    // The barber row linked to the signed-in account, or null
    private Integer myBarberId(HttpServletRequest req) {
        List<Integer> ids = jdbc.queryForList("SELECT barber_id FROM barbers WHERE user_id = ?", Integer.class, Api.uid(req));
        return ids.isEmpty() ? null : ids.get(0);
    }

    // GET /api/leave: my leave that has not finished yet, soonest first
    @GetMapping
    public ResponseEntity<?> list(HttpServletRequest req) {
        if (!"BARBER".equals(Api.role(req))) return notBarber();
        Integer barberId = myBarberId(req);
        if (barberId == null) return Api.err(HttpStatus.FORBIDDEN, "No barber profile is linked to this account.");
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT exception_id, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date, " +
            "DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date, reason, status " +
            "FROM schedule_exceptions WHERE barber_id = ? AND end_date >= ? " +
            "ORDER BY start_date, exception_id", barberId, java.sql.Date.valueOf(LocalDate.now(SlotService.ZONE)));
        return ResponseEntity.ok(rows);
    }

    // POST /api/leave: add approved leave for me
    @PostMapping
    @Transactional
    public ResponseEntity<?> add(@RequestBody LeaveBody b, HttpServletRequest req) {
        if (!"BARBER".equals(Api.role(req))) return notBarber();
        Integer barberId = myBarberId(req);
        if (barberId == null) return Api.err(HttpStatus.FORBIDDEN, "No barber profile is linked to this account.");

        if (b.start_date() == null || b.end_date() == null) {
            return Api.err(HttpStatus.BAD_REQUEST, "Choose a start date and an end date.");
        }
        LocalDate start;
        LocalDate end;
        try {
            start = LocalDate.parse(b.start_date().trim());
            end = LocalDate.parse(b.end_date().trim());
        } catch (Exception e) {
            return Api.err(HttpStatus.BAD_REQUEST, "Invalid start or end date.");
        }
        if (start.isBefore(LocalDate.now(SlotService.ZONE))) {
            return Api.err(HttpStatus.BAD_REQUEST, "Time off can't start in the past.");
        }
        if (end.isBefore(start)) return Api.err(HttpStatus.BAD_REQUEST, "The end date can't be before the start date.");
        String reason = b.reason() == null || b.reason().isBlank() ? DEFAULT_REASON : b.reason().trim();
        if (reason.length() > 255) return Api.err(HttpStatus.BAD_REQUEST, "The reason can be up to 255 characters.");

        // Lock this barber (same pattern as booking) so a booking and a leave request can't slip past each other
        jdbc.queryForList("SELECT barber_id FROM barbers WHERE barber_id = ? FOR UPDATE", barberId);

        Integer overlap = jdbc.queryForObject(
            "SELECT COUNT(*) FROM schedule_exceptions WHERE barber_id = ? AND status IN ('PENDING', 'APPROVED') " +
            "AND start_date <= ? AND end_date >= ?",
            Integer.class, barberId, java.sql.Date.valueOf(end), java.sql.Date.valueOf(start));
        if (overlap != null && overlap > 0) {
            return Api.err(HttpStatus.CONFLICT, "You already have time off that overlaps those dates.");
        }

        Integer booked = jdbc.queryForObject(
            "SELECT COUNT(*) FROM appointments WHERE barber_id = ? AND appointment_date BETWEEN ? AND ? " +
            "AND status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS')",
            Integer.class, barberId, java.sql.Date.valueOf(start), java.sql.Date.valueOf(end));
        if (booked != null && booked > 0) {
            return Api.err(HttpStatus.CONFLICT, "You have " + booked + " active appointment" + (booked == 1 ? "" : "s")
                + " in that range. Complete, cancel or move " + (booked == 1 ? "it" : "them") + " first.");
        }

        jdbc.update("INSERT INTO schedule_exceptions (barber_id, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, 'APPROVED')",
            barberId, java.sql.Date.valueOf(start), java.sql.Date.valueOf(end), reason);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Time off added."));
    }

    // DELETE /api/leave/{id}: remove one of my own leave entries
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> remove(@PathVariable long id, HttpServletRequest req) {
        if (!"BARBER".equals(Api.role(req))) return notBarber();
        Integer barberId = myBarberId(req);
        if (barberId == null) return Api.err(HttpStatus.FORBIDDEN, "No barber profile is linked to this account.");
        jdbc.queryForList("SELECT barber_id FROM barbers WHERE barber_id = ? FOR UPDATE", barberId);
        int rows = jdbc.update("DELETE FROM schedule_exceptions WHERE exception_id = ? AND barber_id = ?", id, barberId);
        if (rows == 0) return Api.err(HttpStatus.NOT_FOUND, "Time off not found.");
        return ResponseEntity.ok(Map.of("message", "Time off removed."));
    }
}
