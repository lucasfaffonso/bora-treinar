package com.boratreinar.service;

import com.boratreinar.dto.workout.WorkoutExerciseRequestDTO;
import com.boratreinar.dto.workout.WorkoutRequestDTO;
import com.boratreinar.dto.workout.WorkoutResponseDTO;
import com.boratreinar.exception.ResourceNotFoundException;
import com.boratreinar.model.User;
import com.boratreinar.model.Workout;
import com.boratreinar.model.WorkoutExercise;
import com.boratreinar.repository.UserRepository;
import com.boratreinar.repository.WorkoutRepository;
import com.boratreinar.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class WorkoutService {

    private final WorkoutRepository workoutRepository;
    private final UserRepository userRepository;

    public WorkoutService(WorkoutRepository workoutRepository, UserRepository userRepository) {
        this.workoutRepository = workoutRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public WorkoutResponseDTO createWorkout(AuthenticatedUser authenticatedUser, WorkoutRequestDTO request) {
        User user = getActiveUser(authenticatedUser.getId());
        Workout workout = new Workout(
                user,
                clean(request.name()),
                cleanNullable(request.description()),
                clean(request.goal()),
                clean(request.level()),
                request.weeklyFrequency()
        );
        workout.replaceExercises(toExercises(request.exercises()));

        return WorkoutResponseDTO.from(workoutRepository.save(workout));
    }

    @Transactional(readOnly = true)
    public List<WorkoutResponseDTO> listWorkouts(AuthenticatedUser authenticatedUser) {
        return workoutRepository.findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(authenticatedUser.getId())
                .stream()
                .map(WorkoutResponseDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkoutResponseDTO getWorkout(AuthenticatedUser authenticatedUser, UUID workoutId) {
        return WorkoutResponseDTO.from(getOwnedWorkout(authenticatedUser.getId(), workoutId));
    }

    @Transactional
    public WorkoutResponseDTO updateWorkout(
            AuthenticatedUser authenticatedUser,
            UUID workoutId,
            WorkoutRequestDTO request
    ) {
        Workout workout = getOwnedWorkout(authenticatedUser.getId(), workoutId);
        workout.update(
                clean(request.name()),
                cleanNullable(request.description()),
                clean(request.goal()),
                clean(request.level()),
                request.weeklyFrequency()
        );
        workout.replaceExercises(toExercises(request.exercises()));

        return WorkoutResponseDTO.from(workout);
    }

    @Transactional
    public void deleteWorkout(AuthenticatedUser authenticatedUser, UUID workoutId) {
        Workout workout = getOwnedWorkout(authenticatedUser.getId(), workoutId);
        workout.softDelete();
    }

    private User getActiveUser(UUID userId) {
        return userRepository.findById(userId)
                .filter(User::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    private Workout getOwnedWorkout(UUID userId, UUID workoutId) {
        return workoutRepository.findByIdAndUserIdAndDeletedAtIsNull(workoutId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout not found"));
    }

    private List<WorkoutExercise> toExercises(List<WorkoutExerciseRequestDTO> exercises) {
        return exercises.stream()
                .sorted(Comparator.comparing(WorkoutExerciseRequestDTO::exerciseOrder))
                .map(exercise -> new WorkoutExercise(
                        clean(exercise.exerciseName()),
                        exercise.exerciseOrder(),
                        exercise.sets(),
                        clean(exercise.reps()),
                        exercise.restSeconds(),
                        cleanNullable(exercise.notes())
                ))
                .toList();
    }

    private String clean(String value) {
        return value.trim();
    }

    private String cleanNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
