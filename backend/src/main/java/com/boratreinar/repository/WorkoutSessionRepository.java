package com.boratreinar.repository;

import com.boratreinar.model.WorkoutSession;
import com.boratreinar.model.WorkoutSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {

    List<WorkoutSession> findAllByUserIdOrderByStartedAtDesc(UUID userId);

    List<WorkoutSession> findAllByUserIdAndWorkoutIdOrderByStartedAtDesc(UUID userId, UUID workoutId);

    Optional<WorkoutSession> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserIdAndWorkoutIdAndStatus(UUID userId, UUID workoutId, WorkoutSessionStatus status);
}
