package com.boratreinar.dto.workout;

import com.boratreinar.model.Workout;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record WorkoutResponseDTO(
        UUID id,
        String name,
        String description,
        String goal,
        String level,
        Integer weeklyFrequency,
        String source,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<WorkoutExerciseResponseDTO> exercises
) {

    public static WorkoutResponseDTO from(Workout workout) {
        return new WorkoutResponseDTO(
                workout.getId(),
                workout.getName(),
                workout.getDescription(),
                workout.getGoal(),
                workout.getLevel(),
                workout.getWeeklyFrequency(),
                workout.getSource(),
                workout.getActive(),
                workout.getCreatedAt(),
                workout.getUpdatedAt(),
                workout.getExercises()
                        .stream()
                        .map(WorkoutExerciseResponseDTO::from)
                        .toList()
        );
    }
}
