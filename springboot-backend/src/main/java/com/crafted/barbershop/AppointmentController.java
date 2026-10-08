package com.crafted.barbershop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {
    private static final List<String> STATUSES =
        List.of("PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DECLINED");
    // Allowed moves for barbers and customers (admins may set any status)
    private static final Map<String, List<String>> NEXT = Map.of(
        "PENDING", List.of("CONFIRMED", "DECLINED", "CANCELLED"),
        "CONFIRMED", List.of("IN_PROGRESS", "CANCELLED"),
        "IN_PROGRESS", List.of("COMPLETED"));

    private final JdbcTemplate jdbc;
    private final SlotService slotService;

    public AppointmentController(JdbcTemplate jdbc, SlotService slotService) {
        this.jdbc = jdbc;
        this.slotService = slotService;
    }

    public record BookRequest(Integer barberId, Integer serviceId, String appointmentDate, String startTime, String notes) {}
    public record StatusRequest(String status) {}
    public record MoveRequest(String appointmentDate, String startTime) {}

    private void log(long appointmentId, String oldStatus, String newStatus, long changedBy) {
        jdbc.update("INSERT INTO appointment_logs (appointment_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)",
            appointmentId, oldStatus, newStatus, changedBy);
    }

    // GET /api/appointments/my: the signed-in user's own appointments (same columns as /api/bootstrap)
    @GetMapping("/my")
    public List<Map<String, Object>> mine(HttpServletRequest req) {
        return jdbc.queryForList(BootstrapController.APPT_FULL +
            "WHERE a.user_id = ? ORDER BY a.appointment_date, a.start_time", Api.uid(req));
    }

    // POST /api/appointments: book a slot (the end time is worked out from the service duration)
    @PostMapping
    @Transactional
    public ResponseEntity<?> book(@RequestBody BookRequest body, HttpServletRequest req) {
        if (body.barberId() == null || body.serviceId() == null || body.appointmentDate() == null || body.startTime() == null) {
            return Api.err(HttpStatus.BAD_REQUEST, "Missing required fields.");
        }
        LocalDate date;
        LocalTime start;
        try {
            date = LocalDate.parse(body.appointmentDate());
            start = LocalTime.parse(body.startTime());
        } catch (Exception e) {
            return Api.err(HttpStatus.BAD_REQUEST, "Invalid date or time.");
        }
        List<Map<String, Object>> svc = jdbc.queryForList(
            "SELECT price, duration_minutes FROM services WHERE service_id = ? AND is_active = TRUE", body.serviceId());
        if (svc.isEmpty()) return Api.err(HttpStatus.BAD_REQUEST, "Service not found.");
        Integer offered = jdbc.queryForObject(
            "SELECT COUNT(*) FROM barber_services bs JOIN barbers b ON b.barber_id = bs.barber_id " +
            "WHERE bs.barber_id = ? AND bs.service_id = ? AND b.is_active = TRUE",
            Integer.class, body.barberId(), body.serviceId());
        if (offered == null || offered == 0) return Api.err(HttpStatus.BAD_REQUEST, "That barber does not offer this service.");

        // Lock this barber's row so two customers cannot take the same slot at the same moment
        jdbc.queryForList("SELECT barber_id FROM barbers WHERE barber_id = ? FOR UPDATE", body.barberId());

        long uid = Api.uid(req);
        LocalTime end = start.plusMinutes(((Number) svc.get(0).get("duration_minutes")).longValue());
        String problem = slotService.slotProblem(body.barberId(), date, start, end, 0);
        if (problem != null) return Api.err(HttpStatus.CONFLICT, problem);

        java.math.BigDecimal price = new java.math.BigDecimal(svc.get(0).get("price").toString());
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                "INSERT INTO appointments (user_id, barber_id, service_id, appointment_date, start_time, end_time, " +
                "price_at_booking, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)", Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, uid);
            ps.setInt(2, body.barberId());
            ps.setInt(3, body.serviceId());
            ps.setDate(4, java.sql.Date.valueOf(date));
            ps.setTime(5, Time.valueOf(start));
            ps.setTime(6, Time.valueOf(end));
            ps.setBigDecimal(7, price);
            ps.setString(8, body.notes() == null || body.notes().isBlank() ? null : body.notes().trim());
            return ps;
        }, keys);
        long id = keys.getKey().longValue();
        log(id, null, "PENDING", uid);
        return ResponseEntity.status(HttpStatus.CREATED).body(
            Map.of("appointmentId", id, "status", "PENDING", "endTime", end.toString()));
    }

    // PATCH /api/appointments/{id}/status: confirm, decline, start, complete or cancel
    @PatchMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> setStatus(@PathVariable long id, @RequestBody StatusRequest body, HttpServletRequest req) {
        long uid = Api.uid(req);
        String role = Api.role(req);
        String target = body.status() == null ? "" : body.status().trim().toUpperCase();
        if (!STATUSES.contains(target)) return Api.err(HttpStatus.BAD_REQUEST, "Unknown status.");

        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT a.user_id, a.status, b.user_id AS barber_user FROM appointments a " +
            "JOIN barbers b ON b.barber_id = a.barber_id WHERE a.appointment_id = ?", id);
        if (rows.isEmpty()) return Api.err(HttpStatus.NOT_FOUND, "Appointment not found.");
        Map<String, Object> row = rows.get(0);
        String old = (String) row.get("status");
        if (old.equals(target)) return Api.err(HttpStatus.BAD_REQUEST, "The appointment is already " + old + ".");

        if (!"ADMIN".equals(role)) {
            boolean mine;
            if ("CUSTOMER".equals(role)) {
                mine = ((Number) row.get("user_id")).longValue() == uid;
            } else {
                mine = "BARBER".equals(role) && row.get("barber_user") != null
                    && ((Number) row.get("barber_user")).longValue() == uid;
            }
            if (!mine) return Api.err(HttpStatus.FORBIDDEN, "This is not your appointment.");
            if ("CUSTOMER".equals(role) && !"CANCELLED".equals(target)) {
                return Api.err(HttpStatus.FORBIDDEN, "Customers can only cancel an appointment.");
            }
            if (!NEXT.getOrDefault(old, List.of()).contains(target)) {
                return Api.err(HttpStatus.BAD_REQUEST, "Cannot change an appointment from " + old + " to " + target + ".");
            }
        }
        jdbc.update("UPDATE appointments SET status = ? WHERE appointment_id = ?", target, id);
        log(id, old, target, uid);
        return ResponseEntity.ok(Map.of("appointmentId", id, "status", target));
    }

    // PATCH /api/appointments/{id}/reschedule: move to a new date and time; the barber must confirm again
    @PatchMapping("/{id}/reschedule")
    @Transactional
    public ResponseEntity<?> reschedule(@PathVariable long id, @RequestBody MoveRequest body, HttpServletRequest req) {
        long uid = Api.uid(req);
        String role = Api.role(req);
        if (body.appointmentDate() == null || body.startTime() == null) {
            return Api.err(HttpStatus.BAD_REQUEST, "Missing required fields.");
        }
        LocalDate date;
        LocalTime start;
        try {
            date = LocalDate.parse(body.appointmentDate());
            start = LocalTime.parse(body.startTime());
        } catch (Exception e) {
            return Api.err(HttpStatus.BAD_REQUEST, "Invalid date or time.");
        }
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT a.user_id, a.barber_id, a.status, s.duration_minutes FROM appointments a " +
            "JOIN services s ON s.service_id = a.service_id WHERE a.appointment_id = ?", id);
        if (rows.isEmpty()) return Api.err(HttpStatus.NOT_FOUND, "Appointment not found.");
        Map<String, Object> row = rows.get(0);
        boolean owner = ((Number) row.get("user_id")).longValue() == uid;
        if (!"ADMIN".equals(role) && !owner) return Api.err(HttpStatus.FORBIDDEN, "This is not your appointment.");
        String old = (String) row.get("status");
        if (!"PENDING".equals(old) && !"CONFIRMED".equals(old)) {
            return Api.err(HttpStatus.BAD_REQUEST, "Only pending or confirmed appointments can be rescheduled.");
        }

        int barberId = ((Number) row.get("barber_id")).intValue();
        // A deactivated barber can no longer take bookings, so the appointment can't be moved onto their calendar
        Integer barberActive = jdbc.queryForObject(
            "SELECT COUNT(*) FROM barbers WHERE barber_id = ? AND is_active = TRUE", Integer.class, barberId);
        if (barberActive == null || barberActive == 0) {
            return Api.err(HttpStatus.CONFLICT, "That barber is no longer available. Please cancel and rebook.");
        }
        jdbc.queryForList("SELECT barber_id FROM barbers WHERE barber_id = ? FOR UPDATE", barberId);
        LocalTime end = start.plusMinutes(((Number) row.get("duration_minutes")).longValue());
        String problem = slotService.slotProblem(barberId, date, start, end, id);   // ignores this booking's own old slot
        if (problem != null) return Api.err(HttpStatus.CONFLICT, problem);

        jdbc.update("UPDATE appointments SET appointment_date = ?, start_time = ?, end_time = ?, status = 'PENDING' " +
            "WHERE appointment_id = ?", java.sql.Date.valueOf(date), Time.valueOf(start), Time.valueOf(end), id);
        if (!"PENDING".equals(old)) log(id, old, "PENDING", uid);
        return ResponseEntity.ok(Map.of("appointmentId", id, "status", "PENDING", "endTime", end.toString()));
    }
}
