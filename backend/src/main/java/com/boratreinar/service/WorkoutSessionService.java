package com.boratreinar.service;

import com.boratreinar.dto.workoutsession.FinishWorkoutSessionRequestDTO;
import com.boratreinar.dto.workoutsession.StartWorkoutSessionRequestDTO;
import com.boratreinar.dto.workoutsession.WorkoutSessionResponseDTO;
import com.boratreinar.exception.BusinessException;
import com.boratreinar.exception.ResourceNotFoundException;
import com.boratreinar.model.User;
import com.boratreinar.model.Workout;
import com.boratreinar.model.WorkoutSession;
import com.boratreinar.model.WorkoutSessionStatus;
import com.boratreinar.repository.UserRepository;
import com.boratreinar.repository.WorkoutRepository;
import com.boratreinar.repository.WorkoutSessionRepository;
import com.boratreinar.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class WorkoutSessionService {

    private final WorkoutSessionRepository workoutSessionRepository;
    private final WorkoutRepository workoutRepository;
    private final UserRepository userRepository;

    public WorkoutSessionService(
            WorkoutSessionRepository workoutSessionRepository,
            WorkoutRepository workoutRepository,
            UserRepository userRepository
    ) {
        this.workoutSessionRepository = workoutSessionRepository;
        this.workoutRepository = workoutRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public WorkoutSessionResponseDTO startSession(
            AuthenticatedUser authenticatedUser,
            UUID workoutId,
            StartWorkoutSessionRequestDTO request
    ) {
        User user = getActiveUser(authenticatedUser.getId());
        Workout workout = getOwnedWorkout(user.getId(), workoutId);

        boolean hasOpenSession = workoutSessionRepository.existsByUserIdAndWorkoutIdAndStatus(
                user.getId(),
                workoutId,
                WorkoutSessionStatus.IN_PROGRESS
        );

        if (hasOpenSession) {
            throw new BusinessException("There is already an active session for this workout");
        }

        WorkoutSession session = new WorkoutSession(
                user,
                workout,
                request == null ? null : request.startedAt(),
                cleanNullable(request == null ? null : request.notes())
        );

        return WorkoutSessionResponseDTO.from(workoutSessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public List<WorkoutSessionResponseDTO> listSessions(AuthenticatedUser authenticatedUser) {
        return workoutSessionRepository.findAllByUserIdOrderByStartedAtDesc(authenticatedUser.getId())
                .stream()
                .map(WorkoutSessionResponseDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<WorkoutSessionResponseDTO> listWorkoutSessions(
            AuthenticatedUser authenticatedUser,
            UUID workoutId
    ) {
        getOwnedWorkout(authenticatedUser.getId(), workoutId);

        return workoutSessionRepository.findAllByUserIdAndWorkoutIdOrderByStartedAtDesc(
                        authenticatedUser.getId(),
                        workoutId
                )
                .stream()
                .map(WorkoutSessionResponseDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkoutSessionResponseDTO getSession(AuthenticatedUser authenticatedUser, UUID sessionId) {
        return WorkoutSessionResponseDTO.from(getOwnedSession(authenticatedUser.getId(), sessionId));
    }

    @Transactional
    public WorkoutSessionResponseDTO finishSession(
            AuthenticatedUser authenticatedUser,
            UUID sessionId,
            FinishWorkoutSessionRequestDTO request
    ) {
        WorkoutSession session = getOwnedSession(authenticatedUser.getId(), sessionId);

        if (!session.isInProgress()) {
            throw new BusinessException("Only in progress sessions can be finished");
        }

        session.finish(
                request == null ? null : request.finishedAt(),
                request == null ? null : request.durationSeconds(),
                request == null ? null : request.xpEarned(),
                cleanNullable(request == null ? null : request.notes())
        );

        return WorkoutSessionResponseDTO.from(session);
    }

    @Transactional
    public WorkoutSessionResponseDTO cancelSession(AuthenticatedUser authenticatedUser, UUID sessionId) {
        WorkoutSession session = getOwnedSession(authenticatedUser.getId(), sessionId);

        if (!session.isInProgress()) {
            throw new BusinessException("Only in progress sessions can be cancelled");
        }

        session.cancel("Session cancelled by user");

        return WorkoutSessionResponseDTO.from(session);
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

    private WorkoutSession getOwnedSession(UUID userId, UUID sessionId) {
        return workoutSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout session not found"));
    }

    private String cleanNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
