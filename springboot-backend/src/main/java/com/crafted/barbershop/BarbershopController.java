package com.crafted.barbershop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Public read-only routes
@RestController
@RequestMapping("/api")
public class BarbershopController {
    private final JdbcTemplate jdbc;

    public BarbershopController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("message", "CRAFTED Barbershop API is running");
    }

    @GetMapping("/services")
    public List<Map<String, Object>> services() {
        return jdbc.queryForList(
                "SELECT service_id, service_name, description, price, duration_minutes, image_url " +
                        "FROM services WHERE is_active = TRUE");
    }

    @GetMapping("/barbers")
    public List<Map<String, Object>> barbers() {
        return jdbc.queryForList(
                "SELECT barber_id, first_name, last_name, bio, specialty, photo_url " +
                        "FROM barbers WHERE is_active = TRUE");
    }

    // POST /api/contact: the Contact Us form.
    // Signed-in customers/barbers: the message is linked to their account (name, email and phone come from the account,
    // so the admin can reply to them there). Guests: a name and at least one valid contact method (email or phone).
    @PostMapping("/contact")
    public ResponseEntity<?> contact(@RequestBody ContactRequest req, HttpServletRequest http) {
        String message = ContactRules.clean(req.message());
        if (message.isEmpty()) return fieldError("message", "Please write a message.");
        if (message.length() > ContactRules.MAX_MESSAGE) return fieldError("message", "Your message can be up to " + ContactRules.MAX_MESSAGE + " characters.");
        if (ContactRules.hasUnsafeControlChars(message)) return fieldError("message", "Your message contains characters that are not allowed.");

        Long uid = (Long) http.getAttribute("uid");
        List<Map<String, Object>> account = uid == null ? List.of() : jdbc.queryForList(
                "SELECT first_name, last_name, email, phone, username FROM users WHERE users_id = ? AND is_active = TRUE", uid);

        if (!account.isEmpty()) {
            Map<String, Object> u = account.get(0);
            String name = (u.get("first_name") + " " + u.get("last_name")).trim();
            jdbc.update(
                    "INSERT INTO contact_messages (user_id, name, email, phone, message) VALUES (?, ?, ?, ?, ?)",
                    uid, name, u.get("email"), u.get("phone"), message);
        } else {
            String name = ContactRules.clean(req.name());
            String email = ContactRules.clean(req.email()).toLowerCase();
            String phone = ContactRules.clean(req.phone());
            if (!ContactRules.validPersonName(name)) return fieldError("name", "Enter your name using letters only.");
            if (email.isEmpty() && phone.isEmpty()) return fieldError("email", "Enter an email address or a phone number so we can get back to you.");
            if (!email.isEmpty() && !ContactRules.validEmail(email)) return fieldError("email", "Enter a valid email address.");
            if (!phone.isEmpty() && !ContactRules.validPhone(phone)) return fieldError("phone", "Enter a valid phone number.");
            jdbc.update(
                    "INSERT INTO contact_messages (name, email, phone, message) VALUES (?, ?, ?, ?)",
                    name, email.isEmpty() ? null : email, phone.isEmpty() ? null : phone, message);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Your message has been sent successfully.");
        return ResponseEntity.ok(response);
    }

    // GET /api/contact/my: the signed-in person's own messages with any reply from the admin (newest first)
    @GetMapping("/contact/my")
    public List<Map<String, Object>> myMessages(HttpServletRequest http) {
        return jdbc.queryForList(
                "SELECT message_id, message, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at, reply, " +
                "DATE_FORMAT(replied_at, '%Y-%m-%d %H:%i') AS replied_at " +
                "FROM contact_messages WHERE user_id = ? ORDER BY created_at DESC, message_id DESC", Api.uid(http));
    }

    private static ResponseEntity<Map<String, Object>> fieldError(String field, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("field", field);
        body.put("error", message);
        return ResponseEntity.badRequest().body(body);
    }

    public record ContactRequest(
            String name,
            String email,
            String phone,
            String message
    ) {}
}
