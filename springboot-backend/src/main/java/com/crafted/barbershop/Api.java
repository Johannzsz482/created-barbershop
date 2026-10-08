package com.crafted.barbershop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

// Small helpers shared by the controllers
final class Api {
    private Api() {}

    // Who is calling: set by JwtAuthFilter from the login token
    static long uid(HttpServletRequest r) { return (Long) r.getAttribute("uid"); }
    static String role(HttpServletRequest r) { return (String) r.getAttribute("role"); }

    static ResponseEntity<Map<String, Object>> err(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }
}
