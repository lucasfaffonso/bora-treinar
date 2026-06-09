package com.boratreinar.dto.workoutsession;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record FinishWorkoutSessionRequestDTO(
        LocalDateTime finishedAt,

        @Min(value = 0, message = "Duration must be zero or positive")
        Integer durationSeconds,

        @Min(value = 0, message = "XP must be zero or positive")
        Integer xpEarned,

        @Size(max = 2000, message = "Notes must have at most 2000 characters")
        String notes
) {
}
