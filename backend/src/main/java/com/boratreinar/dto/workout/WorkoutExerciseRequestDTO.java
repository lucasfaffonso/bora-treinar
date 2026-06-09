package com.boratreinar.dto.workout;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record WorkoutExerciseRequestDTO(
        @NotBlank(message = "Exercise name is required")
        @Size(max = 140, message = "Exercise name must have at most 140 characters")
        String exerciseName,

        @NotNull(message = "Exercise order is required")
        @Min(value = 1, message = "Exercise order must be at least 1")
        Integer exerciseOrder,

        @NotNull(message = "Sets is required")
        @Min(value = 1, message = "Sets must be at least 1")
        @Max(value = 50, message = "Sets must be at most 50")
        Integer sets,

        @NotBlank(message = "Reps is required")
        @Size(max = 60, message = "Reps must have at most 60 characters")
        String reps,

        @Min(value = 0, message = "Rest seconds must be at least 0")
        @Max(value = 3600, message = "Rest seconds must be at most 3600")
        Integer restSeconds,

        @Size(max = 1000, message = "Notes must have at most 1000 characters")
        String notes
) {
}
