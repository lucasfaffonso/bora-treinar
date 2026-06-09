package com.boratreinar.dto.workoutsession;

import com.boratreinar.model.Workout;
import com.boratreinar.model.WorkoutSession;
import com.boratreinar.model.WorkoutSessionStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record WorkoutSessionResponseDTO(
        UUID id,
        UUID workoutId,
        String workoutName,
        LocalDateTime startedAt,
        LocalDateTime finishedAt,
        Integer durationSeconds,
        WorkoutSessionStatus status,
        Integer xpEarned,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static WorkoutSessionResponseDTO from(WorkoutSession session) {
        Workout workout = session.getWorkout();

        return new WorkoutSessionResponseDTO(
                session.getId(),
                workout == null ? null : workout.getId(),
                workout == null ? null : workout.getName(),
                session.getStartedAt(),
                session.getFinishedAt(),
                session.getDurationSeconds(),
                session.getStatus(),
                session.getXpEarned(),
                session.getNotes(),
                session.getCreatedAt(),
                session.getUpdatedAt()
        );
    }
}
