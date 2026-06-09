package com.boratreinar.dto.community;

import com.boratreinar.model.Community;

import java.time.LocalDateTime;
import java.util.UUID;

public record CommunityResponseDTO(
        UUID id,
        String slug,
        String name,
        String description,
        String visibility,
        Boolean premium,
        Boolean joined,
        Long membersCount,
        LocalDateTime createdAt
) {

    public static CommunityResponseDTO from(Community community, boolean joined, long membersCount) {
        return new CommunityResponseDTO(
                community.getId(),
                toSlug(community.getName()),
                community.getName(),
                community.getDescription(),
                community.getVisibility().name(),
                community.getPremium(),
                joined,
                membersCount,
                community.getCreatedAt()
        );
    }

    private static String toSlug(String value) {
        if (value == null || value.isBlank()) {
            return "comunidade";
        }

        return value
                .toLowerCase()
                .replace("á", "a")
                .replace("à", "a")
                .replace("ã", "a")
                .replace("â", "a")
                .replace("é", "e")
                .replace("ê", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ô", "o")
                .replace("õ", "o")
                .replace("ú", "u")
                .replace("ç", "c")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}
