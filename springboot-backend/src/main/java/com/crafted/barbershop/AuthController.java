package com.crafted.barbershop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[A-Za-z]{2,}$");
    private static final Pattern USERNAME = Pattern.compile("^[A-Za-z0-9_.]{3,30}$");
    private static final Pattern PHONE = Pattern.compile("^[0-9+\\- ]{7,20}$");
    // at least 6 characters, with at least one letter and one number
    static final Pattern PASSWORD = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{6,}$");

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(JdbcTemplate jdbc, PasswordEncoder encoder, JwtService jwt) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    public record RegisterRequest(String firstName, String lastName, String username,
                                  String email, String phone, String password) {}

    public record LoginRequest(String identity, String password) {}

    private static String clean(String s) {
        return s == null ? "" : s.trim();
    }

    // The error body tells the front end which field to highlight in red
    private ResponseEntity<Map<String, Object>> fail(HttpStatus status, String field, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("field", field);
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }

    // The user object sent back to the front end. The password is never included.
    private Map<String, Object> userView(long id) {
        return jdbc.queryForMap(
            "SELECT u.users_id, u.first_name, u.last_name, u.email, u.username, u.phone, " +
            "       u.role, u.photo_url, DATE_FORMAT(u.created_at, '%Y-%m-%d') AS created_at, b.barber_id " +
            "FROM users u LEFT JOIN barbers b ON b.user_id = u.users_id " +
            "WHERE u.users_id = ?", id);
    }

    private Map<String, Object> session(long id, String role) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("token", jwt.create(id, role));
        out.put("user", userView(id));
        return out;
    }

    // POST /api/auth/register: create a customer account and sign them in
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        String first = clean(req.firstName());
        String last = clean(req.lastName());
        String username = clean(req.username()).replaceFirst("^@", "");
        String email = clean(req.email()).toLowerCase();   // "@GMAIL.COM" is stored as "@gmail.com"
        String phone = clean(req.phone());
        String password = req.password() == null ? "" : req.password();

        if (first.isEmpty() || first.length() > 50) return fail(HttpStatus.BAD_REQUEST, "firstName", "Enter your first name (up to 50 characters).");
        if (last.isEmpty() || last.length() > 50) return fail(HttpStatus.BAD_REQUEST, "lastName", "Enter your last name (up to 50 characters).");
        if (!USERNAME.matcher(username).matches()) return fail(HttpStatus.BAD_REQUEST, "username", "Username must be 3 to 30 characters: letters, numbers, dot or underscore.");
        if (!EMAIL.matcher(email).matches() || email.length() > 100) return fail(HttpStatus.BAD_REQUEST, "email", "Enter a valid email address.");
        if (!phone.isEmpty() && !PHONE.matcher(phone).matches()) return fail(HttpStatus.BAD_REQUEST, "phone", "Enter a valid phone number.");
        if (!PASSWORD.matcher(password).matches()) return fail(HttpStatus.BAD_REQUEST, "password", "Password must be at least 6 characters with a letter and a number.");

        Integer sameUsername = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE LOWER(username) = ?", Integer.class, username.toLowerCase());
        if (sameUsername != null && sameUsername > 0) return fail(HttpStatus.CONFLICT, "username", "That username is already taken.");
        Integer sameEmail = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE LOWER(email) = ?", Integer.class, email);
        if (sameEmail != null && sameEmail > 0) return fail(HttpStatus.CONFLICT, "email", "That email is already registered.");

        String hash = encoder.encode(password);
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                "INSERT INTO users (first_name, last_name, email, username, phone, password, role) " +
                "VALUES (?, ?, ?, ?, ?, ?, 'CUSTOMER')", Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, first);
            ps.setString(2, last);
            ps.setString(3, email);
            ps.setString(4, username);
            ps.setString(5, phone.isEmpty() ? null : phone);
            ps.setString(6, hash);
            return ps;
        }, keys);

        return ResponseEntity.status(HttpStatus.CREATED).body(session(keys.getKey().longValue(), "CUSTOMER"));
    }

    // POST /api/auth/login: log in with username or email
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        String identity = clean(req.identity()).replaceFirst("^@", "").toLowerCase();
        String password = req.password() == null ? "" : req.password();
        if (identity.isEmpty() || password.isEmpty()) {
            return fail(HttpStatus.BAD_REQUEST, "identity", "Enter your username or email and your password.");
        }

        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT users_id, password, role FROM users " +
            "WHERE is_active = TRUE AND (LOWER(username) = ? OR LOWER(email) = ?)", identity, identity);

        if (rows.isEmpty() || !encoder.matches(password, (String) rows.get(0).get("password"))) {
            return fail(HttpStatus.UNAUTHORIZED, "password", "Incorrect username/email or password.");
        }
        long id = ((Number) rows.get(0).get("users_id")).longValue();
        return ResponseEntity.ok(session(id, (String) rows.get(0).get("role")));
    }

    // GET /api/auth/me: who am I?
    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest req) {
        return userView(Api.uid(req));
    }
}
