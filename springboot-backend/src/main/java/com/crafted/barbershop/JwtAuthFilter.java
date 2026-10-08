package com.crafted.barbershop;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

// Reads "Authorization: Bearer <token>" and, if the token is valid, marks the request as signed in.
// (Created in SecurityConfig, not a @Component, so it only runs once inside the security chain.)
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;

    public JwtAuthFilter(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            Map<String, Object> claims = jwt.verify(header.substring(7));
            if (claims != null) {
                long uid = ((Number) claims.get("uid")).longValue();
                String role = (String) claims.get("role");
                req.setAttribute("uid", uid);
                req.setAttribute("role", role);
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                    uid, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
            }
        }
        chain.doFilter(req, res);
    }
}
