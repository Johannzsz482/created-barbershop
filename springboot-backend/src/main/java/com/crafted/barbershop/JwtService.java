package com.crafted.barbershop;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

// Creates and checks login tokens (standard JWT, HS256). A token proves who the caller is.
@Component
public class JwtService {
    private static final long LIFETIME_SECONDS = 8 * 3600;
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final byte[] key;

    public JwtService(@Value("${app.jwt.secret:crafted-dev-secret-change-me-please-32-chars-minimum}") String secret) {
        this.key = secret.getBytes(StandardCharsets.UTF_8);
    }

    private static String b64(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private byte[] sign(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
    }

    public String create(long uid, String role) {
        try {
            String header = b64("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
            long exp = Instant.now().getEpochSecond() + LIFETIME_SECONDS;
            String json = "{\"uid\":" + uid + ",\"role\":\"" + role + "\",\"exp\":" + exp + "}";
            String payload = b64(json.getBytes(StandardCharsets.UTF_8));
            return header + "." + payload + "." + b64(sign(header + "." + payload));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    // Returns the token's claims (uid, role, exp), or null if it is forged, malformed or expired
    public Map<String, Object> verify(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;
            byte[] expected = sign(parts[0] + "." + parts[1]);
            byte[] given = Base64.getUrlDecoder().decode(parts[2]);
            if (!MessageDigest.isEqual(expected, given)) return null;
            Map<String, Object> claims = MAPPER.readValue(Base64.getUrlDecoder().decode(parts[1]),
                new TypeReference<Map<String, Object>>() {});
            if (((Number) claims.get("exp")).longValue() < Instant.now().getEpochSecond()) return null;
            return claims;
        } catch (Exception e) {
            return null;
        }
    }
}
