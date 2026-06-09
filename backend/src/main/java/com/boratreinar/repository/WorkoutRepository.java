package com.boratreinar.repository;

import com.boratreinar.model.Workout;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkoutRepository extends JpaRepository<Workout, UUID> {

    List<Workout> findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID userId);

    Optional<Workout> findByIdAndUserIdAndDeletedAtIsNull(UUID id, UUID userId);
}
