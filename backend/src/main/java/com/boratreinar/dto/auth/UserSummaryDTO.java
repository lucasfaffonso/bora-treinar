package com.boratreinar.dto.auth;

import com.boratreinar.model.SubscriptionStatus;
import com.boratreinar.model.User;
import com.boratreinar.model.UserRole;

import java.util.UUID;

public record UserSummaryDTO(
        UUID id,
        String name,
        String email,
        UserRole role,
        SubscriptionStatus subscriptionStatus,
        Boolean emailVerified
) {

    public static UserSummaryDTO from(User user) {
        return new UserSummaryDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getSubscriptionStatus(),
                user.getEmailVerified()
        );
    }
}
