package com.boratreinar.dto.auth;

public record AuthResponseDTO(
        String accessToken,
        String tokenType,
        Long expiresIn,
        UserSummaryDTO user
) {

    public static AuthResponseDTO bearer(String accessToken, Long expiresIn, UserSummaryDTO user) {
        return new AuthResponseDTO(accessToken, "Bearer", expiresIn, user);
    }
}
