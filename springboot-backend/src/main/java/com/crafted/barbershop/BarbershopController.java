package com.crafted.barbershop;

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

    @PostMapping("/contact")
    public Map<String, Object> contact(@RequestBody ContactRequest req) {
        String name = req.name() == null ? "" : req.name().trim();
        String email = req.email() == null ? "" : req.email().trim();
        String message = req.message() == null ? "" : req.message().trim();

        if (name.isEmpty() || email.isEmpty() || message.isEmpty()) {
            throw new IllegalArgumentException("Name, email, and message are required.");
        }

        jdbc.update(
                "INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)",
                name, email, message
        );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Your message has been sent successfully.");
        return response;
    }

    public record ContactRequest(
            String name,
            String email,
            String message
    ) {}
}