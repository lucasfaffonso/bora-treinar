package com.boratreinar.dto.user;

import com.boratreinar.model.SubscriptionStatus;
import com.boratreinar.model.User;
import com.boratreinar.model.UserRole;

import java.time.LocalDateTime;
import java.util.UUID;

public record CurrentUserResponseDTO(
        UUID id,
        String name,
        String email,
        UserRole role,
        SubscriptionStatus subscriptionStatus,
        Boolean enabled,
        Boolean emailVerified,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static CurrentUserResponseDTO from(User user) {
        return new CurrentUserResponseDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getSubscriptionStatus(),
                user.getEnabled(),
                user.getEmailVerified(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
