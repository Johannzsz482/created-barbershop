package com.crafted.barbershop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

// Admin-only management routes (SecurityConfig blocks everyone else with 403)
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private static final List<String> DAYS =
        List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY");

    private final JdbcTemplate jdbc;
    private final SlotService slotService;

    public AdminController(JdbcTemplate jdbc, SlotService slotService) {
        this.jdbc = jdbc;
        this.slotService = slotService;
    }

    public record ServiceBody(String service_name, String description, BigDecimal price, Integer duration_minutes) {}
    public record BarberBody(String first_name, String last_name, String bio, String specialty, String photo_url, Integer user_id) {}
    public record AssignBody(List<Integer> serviceIds) {}
    public record AppointmentBody(Integer userId, Integer barberId, Integer serviceId, String appointmentDate,
                                  String startTime, String notes) {}
    public record ScheduleBody(Integer barber_id, String day_of_week, String start_time, String end_time) {}

    private ResponseEntity<?> done(int rows) {
        return rows == 0 ? Api.err(HttpStatus.NOT_FOUND, "Not found.") : ResponseEntity.ok(Map.of("message", "Saved."));
    }

    // ---------- services ----------
    private String serviceProblem(ServiceBody s) {
        if (s.service_name() == null || s.service_name().isBlank() || s.service_name().length() > 100) return "Enter a service name (up to 100 characters).";
        if (s.price() == null || s.price().signum() <= 0) return "Price must be more than 0.";
        if (s.duration_minutes() == null || s.duration_minutes() <= 0) return "Duration must be more than 0 minutes.";
        return null;
    }

    @PostMapping("/services")
    public ResponseEntity<?> addService(@RequestBody ServiceBody s) {
        String problem = serviceProblem(s);
        if (problem != null) return Api.err(HttpStatus.BAD_REQUEST, problem);
        jdbc.update("INSERT INTO services (service_name, description, price, duration_minutes) VALUES (?, ?, ?, ?)",
            s.service_name().trim(), s.description(), s.price(), s.duration_minutes());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Service added."));
    }

    @PutMapping("/services/{id}")
    public ResponseEntity<?> editService(@PathVariable long id, @RequestBody ServiceBody s) {
        String problem = serviceProblem(s);
        if (problem != null) return Api.err(HttpStatus.BAD_REQUEST, problem);
        return done(jdbc.update("UPDATE services SET service_name = ?, description = ?, price = ?, duration_minutes = ? WHERE service_id = ?",
            s.service_name().trim(), s.description(), s.price(), s.duration_minutes(), id));
    }

    @PatchMapping("/services/{id}/toggle")
    public ResponseEntity<?> toggleService(@PathVariable long id) {
        return done(jdbc.update("UPDATE services SET is_active = NOT is_active WHERE service_id = ?", id));
    }

    @DeleteMapping("/services/{id}")
    @Transactional
    public ResponseEntity<?> deleteService(@PathVariable long id) {
        Integer used = jdbc.queryForObject("SELECT COUNT(*) FROM appointments WHERE service_id = ?", Integer.class, id);
        if (used != null && used > 0) return Api.err(HttpStatus.CONFLICT, "This service has bookings. Deactivate it instead.");
        jdbc.update("DELETE FROM barber_services WHERE service_id = ?", id);
        return done(jdbc.update("DELETE FROM services WHERE service_id = ?", id));
    }

    // ---------- barbers ----------
    private String barberProblem(BarberBody b) {
        if (b.first_name() == null || b.first_name().isBlank() || b.first_name().length() > 50) return "Enter the barber's first name.";
        if (b.last_name() == null || b.last_name().isBlank() || b.last_name().length() > 50) return "Enter the barber's last name.";
        return null;
    }

    // The login account a barber is linked to (barbers.user_id, UNIQUE): null means not linked.
    // It must be an active BARBER user that no other barber already uses.
    private String accountProblem(Integer userId, long barberId) {
        if (userId == null) return null;
        Integer ok = jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE users_id = ? AND role = 'BARBER' AND is_active = TRUE", Integer.class, userId);
        if (ok == null || ok == 0) return "Choose an active account that has the Barber role.";
        Integer taken = jdbc.queryForObject(
            "SELECT COUNT(*) FROM barbers WHERE user_id = ? AND barber_id <> ?", Integer.class, userId, barberId);
        if (taken != null && taken > 0) return "That account is already linked to another barber.";
        return null;
    }

    @PostMapping("/barbers")
    public ResponseEntity<?> addBarber(@RequestBody BarberBody b) {
        String problem = barberProblem(b);
        if (problem == null) problem = accountProblem(b.user_id(), 0);
        if (problem != null) return Api.err(HttpStatus.BAD_REQUEST, problem);
        jdbc.update("INSERT INTO barbers (first_name, last_name, bio, specialty, photo_url, user_id) VALUES (?, ?, ?, ?, ?, ?)",
            b.first_name().trim(), b.last_name().trim(), b.bio(), b.specialty(), b.photo_url(), b.user_id());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Barber added."));
    }

    @PutMapping("/barbers/{id}")
    public ResponseEntity<?> editBarber(@PathVariable long id, @RequestBody BarberBody b) {
        String problem = barberProblem(b);
        if (problem == null) problem = accountProblem(b.user_id(), id);
        if (problem != null) return Api.err(HttpStatus.BAD_REQUEST, problem);
        return done(jdbc.update("UPDATE barbers SET first_name = ?, last_name = ?, bio = ?, specialty = ?, photo_url = ?, user_id = ? WHERE barber_id = ?",
            b.first_name().trim(), b.last_name().trim(), b.bio(), b.specialty(), b.photo_url(), b.user_id(), id));
    }

    @PatchMapping("/barbers/{id}/toggle")
    public ResponseEntity<?> toggleBarber(@PathVariable long id) {
        return done(jdbc.update("UPDATE barbers SET is_active = NOT is_active WHERE barber_id = ?", id));
    }

    // Replace the list of services a barber offers (fails if it would remove a service that has bookings)
    @PutMapping("/barbers/{id}/services")
    @Transactional
    public ResponseEntity<?> assignServices(@PathVariable long id, @RequestBody AssignBody body) {
        jdbc.update("DELETE FROM barber_services WHERE barber_id = ?", id);
        if (body.serviceIds() != null) {
            for (Integer serviceId : body.serviceIds()) {
                jdbc.update("INSERT INTO barber_services (barber_id, service_id) VALUES (?, ?)", id, serviceId);
            }
        }
        return ResponseEntity.ok(Map.of("message", "Services updated."));
    }


    // ---------- appointments ----------
    // Create on behalf of a customer. Same slot rules as customer booking; starts as PENDING.
    @PostMapping("/appointments")
    @Transactional
    public ResponseEntity<?> addAppointment(@RequestBody AppointmentBody b, HttpServletRequest req) {
        if (b.userId() == null) return Api.err(HttpStatus.BAD_REQUEST, "Choose a customer.");
        Integer customer = jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE users_id = ? AND role = 'CUSTOMER'", Integer.class, b.userId());
        if (customer == null || customer == 0) return Api.err(HttpStatus.BAD_REQUEST, "Customer not found.");
        Slot slot = checkSlot(b);
        if (slot.error != null) return slot.error;
        jdbc.queryForList("SELECT barber_id FROM barbers WHERE barber_id = ? FOR UPDATE", b.barberId());
        String problem = slotService.slotProblem(b.barberId(), slot.date, slot.start, slot.end, 0);
        if (problem != null) return Api.err(HttpStatus.CONFLICT, problem);
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                "INSERT INTO appointments (user_id, barber_id, service_id, appointment_date, start_time, end_time, " +
                "price_at_booking, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)", Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, b.userId());
            ps.setInt(2, b.barberId());
            ps.setInt(3, b.serviceId());
            ps.setDate(4, java.sql.Date.valueOf(slot.date));
            ps.setTime(5, Time.valueOf(slot.start));
            ps.setTime(6, Time.valueOf(slot.end));
            ps.setBigDecimal(7, slot.price);
            ps.setString(8, cleanNotes(b.notes()));
            return ps;
        }, keys);
        long id = keys.getKey().longValue();
        jdbc.update("INSERT INTO appointment_logs (appointment_id, old_status, new_status, changed_by) VALUES (?, NULL, 'PENDING', ?)",
            id, Api.uid(req));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("appointmentId", id, "status", "PENDING"));
    }

    // Edit barber, service, date, time and notes. The customer and status do not change here
    // (status has its own route). The slot is re-checked only when the barber, service, date or time changed,
    // so notes on a past or finished appointment can still be fixed.
    @PutMapping("/appointments/{id}")
    @Transactional
    public ResponseEntity<?> editAppointment(@PathVariable long id, @RequestBody AppointmentBody b) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT barber_id, service_id, appointment_date, start_time, status FROM appointments WHERE appointment_id = ?", id);
        if (rows.isEmpty()) return Api.err(HttpStatus.NOT_FOUND, "Appointment not found.");
        Map<String, Object> old = rows.get(0);
        Slot slot = checkSlot(b);
        if (slot.error != null) return slot.error;
        boolean moved = ((Number) old.get("barber_id")).intValue() != b.barberId()
            || ((Number) old.get("service_id")).intValue() != b.serviceId()
            || !old.get("appointment_date").toString().equals(slot.date.toString())
            || !((java.sql.Time) old.get("start_time")).toLocalTime().equals(slot.start);
        if (moved) {
            String status = (String) old.get("status");
            if (!List.of("PENDING", "CONFIRMED").contains(status)) {
                return Api.err(HttpStatus.BAD_REQUEST, "Only pending or confirmed appointments can be moved.");
            }
            jdbc.queryForList("SELECT barber_id FROM barbers WHERE barber_id = ? FOR UPDATE", b.barberId());
            String problem = slotService.slotProblem(b.barberId(), slot.date, slot.start, slot.end, id);
            if (problem != null) return Api.err(HttpStatus.CONFLICT, problem);
        }
        // keep the price the customer was quoted unless the service itself changed
        boolean serviceChanged = ((Number) old.get("service_id")).intValue() != b.serviceId();
        jdbc.update("UPDATE appointments SET barber_id = ?, service_id = ?, appointment_date = ?, start_time = ?, end_time = ?, " +
            "price_at_booking = " + (serviceChanged ? "?" : "price_at_booking") + ", notes = ? WHERE appointment_id = ?",
            serviceChanged
                ? new Object[]{b.barberId(), b.serviceId(), java.sql.Date.valueOf(slot.date), Time.valueOf(slot.start), Time.valueOf(slot.end), slot.price, cleanNotes(b.notes()), id}
                : new Object[]{b.barberId(), b.serviceId(), java.sql.Date.valueOf(slot.date), Time.valueOf(slot.start), Time.valueOf(slot.end), cleanNotes(b.notes()), id});
        return ResponseEntity.ok(Map.of("message", "Saved."));
    }

    // Permanently remove an appointment and its status history. (Cancelling keeps the record.)
    @DeleteMapping("/appointments/{id}")
    @Transactional
    public ResponseEntity<?> deleteAppointment(@PathVariable long id) {
        jdbc.update("DELETE FROM appointment_logs WHERE appointment_id = ?", id);
        return done(jdbc.update("DELETE FROM appointments WHERE appointment_id = ?", id));
    }

    private static String cleanNotes(String n) {
        return n == null || n.isBlank() ? null : n.trim();
    }

    // Validates the fields shared by create and edit and works out the end time and price.
    // The caller still does the slot-conflict check (SlotService) inside its transaction.
    private record Slot(LocalDate date, LocalTime start, LocalTime end, BigDecimal price, ResponseEntity<?> error) {}

    private Slot checkSlot(AppointmentBody b) {
        if (b.barberId() == null || b.serviceId() == null || b.appointmentDate() == null || b.startTime() == null) {
            return new Slot(null, null, null, null, Api.err(HttpStatus.BAD_REQUEST, "Missing required fields."));
        }
        LocalDate date;
        LocalTime start;
        try {
            date = LocalDate.parse(b.appointmentDate());
            start = LocalTime.parse(b.startTime());
        } catch (Exception e) {
            return new Slot(null, null, null, null, Api.err(HttpStatus.BAD_REQUEST, "Invalid date or time."));
        }
        List<Map<String, Object>> svc = jdbc.queryForList(
            "SELECT price, duration_minutes FROM services WHERE service_id = ?", b.serviceId());
        if (svc.isEmpty()) return new Slot(null, null, null, null, Api.err(HttpStatus.BAD_REQUEST, "Service not found."));
        Integer offered = jdbc.queryForObject(
            "SELECT COUNT(*) FROM barber_services WHERE barber_id = ? AND service_id = ?", Integer.class, b.barberId(), b.serviceId());
        if (offered == null || offered == 0) {
            return new Slot(null, null, null, null, Api.err(HttpStatus.BAD_REQUEST, "That barber does not offer this service."));
        }
        LocalTime end = start.plusMinutes(((Number) svc.get(0).get("duration_minutes")).longValue());
        BigDecimal price = new BigDecimal(svc.get(0).get("price").toString());
        return new Slot(date, start, end, price, null);
    }

    // ---------- users ----------
    // Activate / deactivate an account. Inactive users cannot sign in (AuthController only accepts is_active = TRUE).
    @PatchMapping("/users/{id}/toggle")
    public ResponseEntity<?> toggleUser(@PathVariable long id, HttpServletRequest req) {
        if (id == Api.uid(req)) return Api.err(HttpStatus.BAD_REQUEST, "You can't deactivate your own account.");
        return done(jdbc.update("UPDATE users SET is_active = NOT is_active WHERE users_id = ?", id));
    }

    // ---------- contact messages ----------
    // GET /api/admin/contact-messages: messages sent from the Contact Us form, newest first (Admin only via SecurityConfig)
    @GetMapping("/contact-messages")
    public List<Map<String, Object>> contactMessages() {
        return jdbc.queryForList(
            "SELECT message_id, name, email, message, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at, is_read " +
            "FROM contact_messages ORDER BY created_at DESC, message_id DESC");
    }

    // PATCH /api/admin/contact-messages/{id}/read: mark one contact message as read (Admin only via SecurityConfig)
    @PatchMapping("/contact-messages/{id}/read")
    public ResponseEntity<?> markContactMessageRead(@PathVariable long id) {
        int rows = jdbc.update("UPDATE contact_messages SET is_read = TRUE WHERE message_id = ?", id);
        if (rows == 0) {
            // 0 rows can also mean "already read", so only report 404 when the message really does not exist
            Integer found = jdbc.queryForObject("SELECT COUNT(*) FROM contact_messages WHERE message_id = ?", Integer.class, id);
            if (found == null || found == 0) return Api.err(HttpStatus.NOT_FOUND, "Message not found.");
        }
        return ResponseEntity.ok(Map.of("message", "Marked as read."));
    }

    // ---------- schedules ----------
    @PostMapping("/schedules")
    public ResponseEntity<?> addSchedule(@RequestBody ScheduleBody s) {
        if (s.barber_id() == null || s.day_of_week() == null || s.start_time() == null || s.end_time() == null) {
            return Api.err(HttpStatus.BAD_REQUEST, "Missing required fields.");
        }
        String day = s.day_of_week().trim().toUpperCase();
        if (!DAYS.contains(day)) return Api.err(HttpStatus.BAD_REQUEST, "Unknown day of the week.");
        LocalTime start;
        LocalTime end;
        try {
            start = LocalTime.parse(s.start_time());
            end = LocalTime.parse(s.end_time());
        } catch (Exception e) {
            return Api.err(HttpStatus.BAD_REQUEST, "Invalid start or end time.");
        }
        if (!end.isAfter(start)) return Api.err(HttpStatus.BAD_REQUEST, "The end time must be after the start time.");
        Integer same = jdbc.queryForObject("SELECT COUNT(*) FROM schedules WHERE barber_id = ? AND day_of_week = ?",
            Integer.class, s.barber_id(), day);
        if (same != null && same > 0) return Api.err(HttpStatus.CONFLICT, "That barber already has a schedule for that day.");
        jdbc.update("INSERT INTO schedules (barber_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)",
            s.barber_id(), day, java.sql.Time.valueOf(start), java.sql.Time.valueOf(end));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Schedule added."));
    }

    // Edit an existing schedule row (day and/or working hours). The barber and active flag are left unchanged.
    @PutMapping("/schedules/{id}")
    public ResponseEntity<?> editSchedule(@PathVariable long id, @RequestBody ScheduleBody s) {
        if (s.start_time() == null || s.end_time() == null) {
            return Api.err(HttpStatus.BAD_REQUEST, "Missing required fields.");
        }
        List<Map<String, Object>> current = jdbc.queryForList(
            "SELECT barber_id, day_of_week FROM schedules WHERE schedule_id = ?", id);
        if (current.isEmpty()) return Api.err(HttpStatus.NOT_FOUND, "Not found.");
        String day = s.day_of_week() == null ? current.get(0).get("day_of_week").toString() : s.day_of_week().trim().toUpperCase();
        if (!DAYS.contains(day)) return Api.err(HttpStatus.BAD_REQUEST, "Unknown day of the week.");
        LocalTime start;
        LocalTime end;
        try {
            start = LocalTime.parse(s.start_time());
            end = LocalTime.parse(s.end_time());
        } catch (Exception e) {
            return Api.err(HttpStatus.BAD_REQUEST, "Invalid start or end time.");
        }
        if (!end.isAfter(start)) return Api.err(HttpStatus.BAD_REQUEST, "The end time must be after the start time.");
        Integer same = jdbc.queryForObject(
            "SELECT COUNT(*) FROM schedules WHERE barber_id = ? AND day_of_week = ? AND schedule_id <> ?",
            Integer.class, ((Number) current.get(0).get("barber_id")).intValue(), day, id);
        if (same != null && same > 0) return Api.err(HttpStatus.CONFLICT, "That barber already has a schedule for that day.");
        return done(jdbc.update("UPDATE schedules SET day_of_week = ?, start_time = ?, end_time = ? WHERE schedule_id = ?",
            day, java.sql.Time.valueOf(start), java.sql.Time.valueOf(end), id));
    }

    @PatchMapping("/schedules/{id}/toggle")
    public ResponseEntity<?> toggleSchedule(@PathVariable long id) {
        return done(jdbc.update("UPDATE schedules SET is_active = NOT is_active WHERE schedule_id = ?", id));
    }

    @DeleteMapping("/schedules/{id}")
    public ResponseEntity<?> deleteSchedule(@PathVariable long id) {
        return done(jdbc.update("DELETE FROM schedules WHERE schedule_id = ?", id));
    }
}
