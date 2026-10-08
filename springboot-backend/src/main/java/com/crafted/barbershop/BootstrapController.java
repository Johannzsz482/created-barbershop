package com.crafted.barbershop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// One call that loads everything the React app needs, filtered by who is asking:
//   anyone   -> barbers, services, schedules, barber_services
//   customer -> + their own appointments (other people's bookings show only as busy times), their logs, themselves
//   barber   -> + their own appointments, the customers on them, their logs
//   admin    -> everything
@RestController
@RequestMapping("/api")
public class BootstrapController {
    private static final String DATE_TIME = "DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date, " +
        "TIME_FORMAT(a.start_time, '%H:%i') AS start_time, TIME_FORMAT(a.end_time, '%H:%i') AS end_time, ";
    static final String APPT_FULL = "SELECT a.appointment_id, a.user_id, a.barber_id, a.service_id, " + DATE_TIME +
        "a.price_at_booking, a.status, a.notes, DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') AS created_at FROM appointments a ";
    // for customers: user_id and notes are hidden on bookings that are not theirs
    private static final String APPT_MASKED = "SELECT a.appointment_id, CASE WHEN a.user_id = ? THEN a.user_id END AS user_id, " +
        "a.barber_id, a.service_id, " + DATE_TIME + "a.status, CASE WHEN a.user_id = ? THEN a.notes END AS notes, " +
        "DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i') AS created_at FROM appointments a ";
    private static final String USER_COLS = "SELECT u.users_id, u.first_name, u.last_name, u.email, u.username, u.phone, " +
        "u.role, u.photo_url, DATE_FORMAT(u.created_at, '%Y-%m-%d') AS created_at, u.is_active FROM users u ";
    private static final String LOG_COLS = "SELECT l.log_id, l.appointment_id, l.old_status, l.new_status, l.changed_by, " +
        "DATE_FORMAT(l.changed_at, '%Y-%m-%d %H:%i') AS changed_at FROM appointment_logs l ";

    private final JdbcTemplate jdbc;

    public BootstrapController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/bootstrap")
    public Map<String, Object> bootstrap(HttpServletRequest req) {
        Long uid = (Long) req.getAttribute("uid");
        String role = (String) req.getAttribute("role");

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("barbers", jdbc.queryForList(
            "SELECT barber_id, user_id, first_name, last_name, bio, specialty, photo_url, is_active FROM barbers"));
        out.put("services", jdbc.queryForList(
            "SELECT service_id, service_name, description, price, duration_minutes, image_url, is_active FROM services"));
        out.put("schedules", jdbc.queryForList(
            "SELECT schedule_id, barber_id, day_of_week, TIME_FORMAT(start_time, '%H:%i') AS start_time, " +
            "TIME_FORMAT(end_time, '%H:%i') AS end_time, is_active FROM schedules"));
        out.put("barberServices", jdbc.queryForList("SELECT barber_id, service_id FROM barber_services"));

        List<Map<String, Object>> appointments = List.of(), users = List.of(), logs = List.of();
        if (uid != null && "ADMIN".equals(role)) {
            appointments = jdbc.queryForList(APPT_FULL + "ORDER BY a.appointment_id");
            users = jdbc.queryForList(USER_COLS + "ORDER BY u.users_id");
            logs = jdbc.queryForList(LOG_COLS + "ORDER BY l.log_id");
        } else if (uid != null && "BARBER".equals(role)) {
            List<Map<String, Object>> mine = jdbc.queryForList("SELECT barber_id FROM barbers WHERE user_id = ?", uid);
            if (!mine.isEmpty()) {
                Object barberId = mine.get(0).get("barber_id");
                appointments = jdbc.queryForList(APPT_FULL + "WHERE a.barber_id = ? ORDER BY a.appointment_id", barberId);
                users = jdbc.queryForList(USER_COLS + "WHERE u.users_id = ? OR u.users_id IN " +
                    "(SELECT user_id FROM appointments WHERE barber_id = ?) ORDER BY u.users_id", uid, barberId);
                logs = jdbc.queryForList(LOG_COLS + "JOIN appointments a ON a.appointment_id = l.appointment_id " +
                    "WHERE a.barber_id = ? ORDER BY l.log_id", barberId);
            }
        } else if (uid != null) {
            appointments = jdbc.queryForList(APPT_MASKED + "ORDER BY a.appointment_id", uid, uid);
            users = jdbc.queryForList(USER_COLS + "WHERE u.users_id = ?", uid);
            logs = jdbc.queryForList(LOG_COLS + "JOIN appointments a ON a.appointment_id = l.appointment_id " +
                "WHERE a.user_id = ? ORDER BY l.log_id", uid);
        }
        out.put("appointments", appointments);
        out.put("users", users);
        out.put("logs", logs);
        return out;
    }
}
