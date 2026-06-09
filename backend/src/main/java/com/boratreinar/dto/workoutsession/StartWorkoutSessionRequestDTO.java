package com.boratreinar.dto.workoutsession;

import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record StartWorkoutSessionRequestDTO(
        LocalDateTime startedAt,

        @Size(max = 2000, message = "Notes must have at most 2000 characters")
        String notes
) {
}
