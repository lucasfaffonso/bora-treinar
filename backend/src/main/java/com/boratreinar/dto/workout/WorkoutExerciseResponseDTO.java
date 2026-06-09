package com.boratreinar.dto.workout;

import com.boratreinar.model.WorkoutExercise;

import java.util.UUID;

public record WorkoutExerciseResponseDTO(
        UUID id,
        String exerciseName,
        Integer exerciseOrder,
        Integer sets,
        String reps,
        Integer restSeconds,
        String notes
) {

    public static WorkoutExerciseResponseDTO from(WorkoutExercise exercise) {
        return new WorkoutExerciseResponseDTO(
                exercise.getId(),
                exercise.getExerciseName(),
                exercise.getExerciseOrder(),
                exercise.getSets(),
                exercise.getReps(),
                exercise.getRestSeconds(),
                exercise.getNotes()
        );
    }
}
