package com.crafted.barbershop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/barbers")
public class SlotController {
    private final JdbcTemplate jdbc;
    private final SlotService slotService;

    public SlotController(JdbcTemplate jdbc, SlotService slotService) {
        this.jdbc = jdbc;
        this.slotService = slotService;
    }

    // GET /api/barbers/{barberId}/slots?date=2026-10-12&serviceId=1[&excludeAppointmentId=7]
    // Any signed-in user. excludeAppointmentId is for rescheduling: that booking's own old slot counts as free.
    @GetMapping("/{barberId}/slots")
    public ResponseEntity<?> slots(@PathVariable int barberId,
                                   @RequestParam(required = false) String date,
                                   @RequestParam(required = false) Integer serviceId,
                                   @RequestParam(required = false) Long excludeAppointmentId,
                                   HttpServletRequest req) {
        if (date == null || serviceId == null) {
            return Api.err(HttpStatus.BAD_REQUEST, "date and serviceId are required.");
        }
        LocalDate day;
        try {
            day = LocalDate.parse(date);
        } catch (Exception e) {
            return Api.err(HttpStatus.BAD_REQUEST, "Invalid date. Use YYYY-MM-DD.");
        }

        List<Map<String, Object>> svc = jdbc.queryForList(
            "SELECT duration_minutes FROM services WHERE service_id = ? AND is_active = TRUE", serviceId);
        if (svc.isEmpty()) return Api.err(HttpStatus.BAD_REQUEST, "Service not found.");

        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM barbers WHERE barber_id = ?", Integer.class, barberId);
        if (exists == null || exists == 0) return Api.err(HttpStatus.NOT_FOUND, "Barber not found.");
        Integer offered = jdbc.queryForObject(
            "SELECT COUNT(*) FROM barber_services bs JOIN barbers b ON b.barber_id = bs.barber_id " +
            "WHERE bs.barber_id = ? AND bs.service_id = ? AND b.is_active = TRUE", Integer.class, barberId, serviceId);
        if (offered == null || offered == 0) {
            return Api.err(HttpStatus.BAD_REQUEST, "That barber does not offer this service.");
        }

        long exclude = 0;
        if (excludeAppointmentId != null) {
            List<Map<String, Object>> owner = jdbc.queryForList(
                "SELECT user_id FROM appointments WHERE appointment_id = ?", excludeAppointmentId);
            if (owner.isEmpty()) return Api.err(HttpStatus.NOT_FOUND, "Appointment not found.");
            boolean mine = ((Number) owner.get(0).get("user_id")).longValue() == Api.uid(req);
            if (!mine && !"ADMIN".equals(Api.role(req))) return Api.err(HttpStatus.FORBIDDEN, "This is not your appointment.");
            exclude = excludeAppointmentId;
        }

        int duration = ((Number) svc.get(0).get("duration_minutes")).intValue();
        SlotService.SlotList result = slotService.slots(barberId, day, duration, exclude);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("barberId", barberId);
        body.put("serviceId", serviceId);
        body.put("date", day.toString());
        body.put("durationMinutes", duration);
        body.put("timezone", SlotService.ZONE.getId());
        body.put("closedReason", result.closedReason());   // null, NOT_WORKING or ON_LEAVE (then slots is empty)
        body.put("slots", result.slots());                 // each: start, end, available, reason (PAST or BOOKED)
        return ResponseEntity.ok(body);
    }
}
