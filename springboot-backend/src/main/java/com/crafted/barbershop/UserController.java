package com.crafted.barbershop;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;

    // Same rules as registration (AuthController), kept here so profile editing is self-contained
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[A-Za-z]{2,}$");
    private static final Pattern USERNAME = Pattern.compile("^[A-Za-z0-9_.]{3,30}$");
    private static final Pattern PHONE = Pattern.compile("^[0-9+\\- ]{7,20}$");

    // Profile pictures are saved as files in <upload dir>/avatars and served at /uploads/avatars/<name> (see AppConfig)
    private static final String PHOTO_PREFIX = "/uploads/avatars/";
    private static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024;   // keep in step with spring.servlet.multipart in application.properties
    private final Path avatarDir;

    public UserController(JdbcTemplate jdbc, PasswordEncoder encoder, @Value("${app.upload.dir:uploads}") String uploadDir) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.avatarDir = Paths.get(uploadDir).toAbsolutePath().normalize().resolve("avatars");
    }

    public record PasswordRequest(String current, String next) {}
    public record DeleteRequest(String password) {}
    public record ProfileRequest(String firstName, String lastName, String username, String email, String phone) {}

    private boolean passwordMatches(long id, String given) {
        String hash = jdbc.queryForObject("SELECT password FROM users WHERE users_id = ?", String.class, id);
        return given != null && hash != null && encoder.matches(given, hash);
    }

    private static String clean(String s) {
        return s == null ? "" : s.trim();
    }

    // The error body tells the front end which field to highlight in red (same shape as AuthController)
    private static ResponseEntity<Map<String, Object>> fieldError(HttpStatus status, String field, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("field", field);
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }

    private boolean usernameTaken(String username, long exceptId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE LOWER(username) = ? AND users_id <> ?",
            Integer.class, username.toLowerCase(), exceptId);
        return n != null && n > 0;
    }

    private boolean emailTaken(String email, long exceptId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE LOWER(email) = ? AND users_id <> ?",
            Integer.class, email, exceptId);
        return n != null && n > 0;
    }

    // PUT /api/users/{id}: customers, barbers and admins edit their own first name, last name, username, email and phone.
    // Nothing else on the account (password, role, active flag, picture) can be changed here.
    // A barber's name is also copied to their public barber profile so the website shows the same name.
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateProfile(@PathVariable long id, @RequestBody ProfileRequest body, HttpServletRequest req) {
        if (id != Api.uid(req)) {
            return Api.err(HttpStatus.FORBIDDEN, "You can only edit your own profile.");
        }
        String first = clean(body.firstName());
        String last = clean(body.lastName());
        String username = clean(body.username()).replaceFirst("^@", "");
        String email = clean(body.email()).toLowerCase();
        String phone = clean(body.phone());

        if (first.isEmpty() || first.length() > 50) return fieldError(HttpStatus.BAD_REQUEST, "firstName", "Enter your first name (up to 50 characters).");
        if (last.isEmpty() || last.length() > 50) return fieldError(HttpStatus.BAD_REQUEST, "lastName", "Enter your last name (up to 50 characters).");
        if (!USERNAME.matcher(username).matches()) return fieldError(HttpStatus.BAD_REQUEST, "username", "Username must be 3 to 30 characters: letters, numbers, dot or underscore.");
        if (!EMAIL.matcher(email).matches() || email.length() > 100) return fieldError(HttpStatus.BAD_REQUEST, "email", "Enter a valid email address.");
        if (!phone.isEmpty() && !PHONE.matcher(phone).matches()) return fieldError(HttpStatus.BAD_REQUEST, "phone", "Enter a valid phone number.");

        // Someone else already using it? (your own current username/email is fine)
        if (usernameTaken(username, id)) return fieldError(HttpStatus.CONFLICT, "username", "That username is already taken.");
        if (emailTaken(email, id)) return fieldError(HttpStatus.CONFLICT, "email", "That email is already registered.");

        try {
            jdbc.update("UPDATE users SET first_name = ?, last_name = ?, username = ?, email = ?, phone = ? WHERE users_id = ?",
                first, last, username, email, phone.isEmpty() ? null : phone, id);
        } catch (DataIntegrityViolationException e) {
            // two people saving the same value at the same moment: the database's UNIQUE rule caught it
            if (usernameTaken(username, id)) return fieldError(HttpStatus.CONFLICT, "username", "That username is already taken.");
            if (emailTaken(email, id)) return fieldError(HttpStatus.CONFLICT, "email", "That email is already registered.");
            throw e;
        }
        if (isBarber(req)) {
            jdbc.update("UPDATE barbers SET first_name = ?, last_name = ? WHERE user_id = ?", first, last, id);
        }

        Map<String, Object> saved = new LinkedHashMap<>();   // exactly what was stored, so the screen shows the same
        saved.put("first_name", first);
        saved.put("last_name", last);
        saved.put("username", username);
        saved.put("email", email);
        saved.put("phone", phone.isEmpty() ? null : phone);
        return ResponseEntity.ok(saved);
    }

    // PUT /api/users/{id}/password: change your own password
    @PutMapping("/{id}/password")
    public ResponseEntity<?> changePassword(@PathVariable long id, @RequestBody PasswordRequest body, HttpServletRequest req) {
        if (id != Api.uid(req)) return Api.err(HttpStatus.FORBIDDEN, "You can only change your own password.");
        if (!passwordMatches(id, body.current())) return Api.err(HttpStatus.BAD_REQUEST, "Your current password is incorrect.");
        if (body.next() == null || !AuthController.PASSWORD.matcher(body.next()).matches()) {
            return Api.err(HttpStatus.BAD_REQUEST, "New password must be at least 6 characters with a letter and a number.");
        }
        if (body.next().equals(body.current())) return Api.err(HttpStatus.BAD_REQUEST, "Choose a password you have not used just now.");
        jdbc.update("UPDATE users SET password = ? WHERE users_id = ?", encoder.encode(body.next()), id);
        return ResponseEntity.ok(Map.of("message", "Password changed."));
    }

    // PUT /api/users/{id}/photo: upload or replace your own profile picture (multipart field "file": JPG, PNG or WEBP, up to 5 MB)
    @PutMapping("/{id}/photo")
    public ResponseEntity<?> uploadPhoto(@PathVariable long id, @RequestParam("file") MultipartFile file, HttpServletRequest req) {
        if (id != Api.uid(req)) return Api.err(HttpStatus.FORBIDDEN, "You can only change your own picture.");
        boolean barber = isBarber(req);
        if (barber && !hasBarberProfile(id)) return Api.err(HttpStatus.NOT_FOUND, "No barber profile is linked to this account.");
        if (file.isEmpty()) return Api.err(HttpStatus.BAD_REQUEST, "Choose an image to upload.");
        if (file.getSize() > MAX_PHOTO_BYTES) return Api.err(HttpStatus.PAYLOAD_TOO_LARGE, "That image is larger than 5 MB.");

        // Decide the type from the file's own first bytes, never from the browser's filename or content type
        String ext;
        try {
            ext = imageExtension(file);
        } catch (IOException e) {
            return Api.err(HttpStatus.BAD_REQUEST, "That file could not be read.");
        }
        if (ext == null) return Api.err(HttpStatus.BAD_REQUEST, "Only JPG, PNG or WEBP images are allowed.");

        // The server picks the file name, so nothing from the upload ever becomes part of a path
        String name = UUID.randomUUID() + "." + ext;
        Path target = avatarDir.resolve(name);
        try {
            Files.createDirectories(avatarDir);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target);
            }
        } catch (IOException e) {
            return Api.err(HttpStatus.INTERNAL_SERVER_ERROR, "The picture could not be saved. Please try again.");
        }

        String previous = currentPhoto(id, barber);
        String url = PHOTO_PREFIX + name;
        try {
            savePhoto(id, barber, url);
        } catch (RuntimeException e) {
            deleteAvatarFile(PHOTO_PREFIX + name);   // don't leave an unused file behind
            throw e;
        }
        deleteAvatarFile(previous);                  // one picture per user: the replaced file goes
        return ResponseEntity.ok(Map.of("photo_url", url));
    }

    // DELETE /api/users/{id}/photo: remove your own profile picture (back to the default icon)
    @DeleteMapping("/{id}/photo")
    public ResponseEntity<?> removePhoto(@PathVariable long id, HttpServletRequest req) {
        if (id != Api.uid(req)) return Api.err(HttpStatus.FORBIDDEN, "You can only change your own picture.");
        boolean barber = isBarber(req);
        if (barber && !hasBarberProfile(id)) return Api.err(HttpStatus.NOT_FOUND, "No barber profile is linked to this account.");
        String previous = currentPhoto(id, barber);
        savePhoto(id, barber, null);
        deleteAvatarFile(previous);
        return ResponseEntity.ok(Map.of("message", "Picture removed."));
    }

    private static boolean isBarber(HttpServletRequest req) {
        return "BARBER".equals(Api.role(req));
    }

    private boolean hasBarberProfile(long userId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM barbers WHERE user_id = ?", Integer.class, userId);
        return n != null && n > 0;
    }

    // A barber's picture is the public one (barbers.photo_url); everyone else's is users.photo_url
    private String currentPhoto(long id, boolean barber) {
        List<String> rows = jdbc.queryForList(
            barber ? "SELECT photo_url FROM barbers WHERE user_id = ?" : "SELECT photo_url FROM users WHERE users_id = ?",
            String.class, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private void savePhoto(long id, boolean barber, String url) {
        jdbc.update(barber ? "UPDATE barbers SET photo_url = ? WHERE user_id = ?" : "UPDATE users SET photo_url = ? WHERE users_id = ?", url, id);
    }

    // JPG, PNG or WEBP by file signature; null for anything else (SVG, GIF, PDF, renamed files...)
    private static String imageExtension(MultipartFile file) throws IOException {
        byte[] h = new byte[12];
        int n;
        try (InputStream in = file.getInputStream()) {
            n = in.readNBytes(h, 0, h.length);
        }
        if (n >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) return "jpg";
        if (n >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G'
            && h[4] == 0x0D && h[5] == 0x0A && h[6] == 0x1A && h[7] == 0x0A) return "png";
        if (n >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
            && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return "webp";
        return null;
    }

    // Deletes a stored upload, but only a file sitting directly inside the avatars folder. Anything else is left alone.
    private void deleteAvatarFile(String photoUrl) {
        if (photoUrl == null || !photoUrl.startsWith(PHOTO_PREFIX)) return;
        Path file = avatarDir.resolve(photoUrl.substring(PHOTO_PREFIX.length())).normalize();
        if (!avatarDir.equals(file.getParent())) return;
        try {
            Files.deleteIfExists(file);
        } catch (IOException ignored) {
            // a leftover file is harmless; the picture itself is already changed
        }
    }

    // DELETE /api/users/{id}: a customer closes their own account (their active bookings are cancelled)
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteAccount(@PathVariable long id, @RequestBody DeleteRequest body, HttpServletRequest req) {
        if (id != Api.uid(req) || !"CUSTOMER".equals(Api.role(req))) {
            return Api.err(HttpStatus.FORBIDDEN, "Only customers can delete their own account.");
        }
        if (!passwordMatches(id, body.password())) return Api.err(HttpStatus.BAD_REQUEST, "Your password is incorrect.");
        List<Map<String, Object>> active = jdbc.queryForList(
            "SELECT appointment_id, status FROM appointments WHERE user_id = ? AND status IN ('PENDING', 'CONFIRMED')", id);
        for (Map<String, Object> a : active) {
            long apptId = ((Number) a.get("appointment_id")).longValue();
            jdbc.update("UPDATE appointments SET status = 'CANCELLED' WHERE appointment_id = ?", apptId);
            jdbc.update("INSERT INTO appointment_logs (appointment_id, old_status, new_status, changed_by) VALUES (?, ?, 'CANCELLED', ?)",
                apptId, a.get("status"), id);
        }
        jdbc.update("UPDATE users SET is_active = FALSE WHERE users_id = ?", id);
        return ResponseEntity.ok(Map.of("message", "Account deleted."));
    }
}