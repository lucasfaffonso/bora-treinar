package com.boratreinar.dto.workout;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record WorkoutRequestDTO(
        @NotBlank(message = "Workout name is required")
        @Size(max = 140, message = "Workout name must have at most 140 characters")
        String name,

        @Size(max = 2000, message = "Description must have at most 2000 characters")
        String description,

        @NotBlank(message = "Goal is required")
        @Size(max = 80, message = "Goal must have at most 80 characters")
        String goal,

        @NotBlank(message = "Level is required")
        @Size(max = 60, message = "Level must have at most 60 characters")
        String level,

        @Min(value = 1, message = "Weekly frequency must be at least 1")
        @Max(value = 14, message = "Weekly frequency must be at most 14")
        Integer weeklyFrequency,

        @NotEmpty(message = "At least one exercise is required")
        @Size(max = 100, message = "Workout must have at most 100 exercises")
        List<@Valid WorkoutExerciseRequestDTO> exercises
) {
}
