package com.boratreinar.security;

import com.boratreinar.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    private final JwtProperties jwtProperties;

    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    @NonNull
    public String generateAccessToken(@NonNull User user) {
        Instant now = Instant.now();
        Instant expiration = now.plusMillis(getExpirationMillis());

        return Jwts.builder()
                .subject(user.getId().toString())
                .claims(Map.of(
                        "email", user.getEmail(),
                        "role", user.getRole().name()
                ))
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiration))
                .signWith(getSigningKey())
                .compact();
    }

    @NonNull
    public UUID extractUserId(@NonNull String token) {
        return UUID.fromString(extractClaims(token).getSubject());
    }

    public boolean isTokenValid(@NonNull String token) {
        Claims claims = extractClaims(token);
        Date expiration = claims.getExpiration();

        return expiration != null && expiration.after(new Date());
    }

    public long getExpirationMillis() {
        return jwtProperties.expiration() != null ? jwtProperties.expiration() : 3600000L;
    }

    @NonNull
    private Claims extractClaims(@NonNull String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    @NonNull
    private SecretKey getSigningKey() {
        String secret = jwtProperties.secret();

        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT secret must have at least 32 characters");
        }

        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
