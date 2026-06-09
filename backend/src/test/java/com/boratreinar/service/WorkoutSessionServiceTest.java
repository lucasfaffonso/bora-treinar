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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
@ExtendWith(MockitoExtension.class)
class WorkoutSessionServiceTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID WORKOUT_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID SESSION_ID = UUID.fromString("00000000-0000-0000-0000-000000000003");

    @Mock
    private WorkoutSessionRepository workoutSessionRepository;

    @Mock
    private WorkoutRepository workoutRepository;

    @Mock
    private UserRepository userRepository;

    private WorkoutSessionService workoutSessionService;

    @BeforeEach
    void setUp() {
        workoutSessionService = new WorkoutSessionService(
                workoutSessionRepository,
                workoutRepository,
                userRepository
        );
    }

    @Test
    void startSessionShouldCreateSessionForOwnedWorkout() throws Exception {
        User user = buildUser();
        Workout workout = buildWorkout(user);
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);
        StartWorkoutSessionRequestDTO request = new StartWorkoutSessionRequestDTO(
                LocalDateTime.of(2026, 6, 4, 20, 0),
                "Inicio do treino"
        );

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(workoutRepository.findByIdAndUserIdAndDeletedAtIsNull(WORKOUT_ID, USER_ID))
                .thenReturn(Optional.of(workout));
        when(workoutSessionRepository.existsByUserIdAndWorkoutIdAndStatus(
                USER_ID,
                WORKOUT_ID,
                WorkoutSessionStatus.IN_PROGRESS
        )).thenReturn(false);
        when(workoutSessionRepository.save(any(WorkoutSession.class))).thenAnswer(invocation -> {
            WorkoutSession session = invocation.getArgument(0);
            setField(session, "id", SESSION_ID);
            return session;
        });

        WorkoutSessionResponseDTO response = workoutSessionService.startSession(
                authenticatedUser,
                WORKOUT_ID,
                request
        );

        ArgumentCaptor<WorkoutSession> sessionCaptor = ArgumentCaptor.forClass(WorkoutSession.class);
        verify(workoutSessionRepository).save(sessionCaptor.capture());

        WorkoutSession savedSession = sessionCaptor.getValue();
        assertThat(savedSession.getUser().getId()).isEqualTo(USER_ID);
        assertThat(savedSession.getWorkout().getId()).isEqualTo(WORKOUT_ID);
        assertThat(savedSession.getStatus()).isEqualTo(WorkoutSessionStatus.IN_PROGRESS);
        assertThat(response.id()).isEqualTo(SESSION_ID);
        assertThat(response.workoutId()).isEqualTo(WORKOUT_ID);
        assertThat(response.status()).isEqualTo(WorkoutSessionStatus.IN_PROGRESS);
    }

    @Test
    void startSessionShouldFailWhenWorkoutHasOpenSession() throws Exception {
        User user = buildUser();
        Workout workout = buildWorkout(user);
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(workoutRepository.findByIdAndUserIdAndDeletedAtIsNull(WORKOUT_ID, USER_ID))
                .thenReturn(Optional.of(workout));
        when(workoutSessionRepository.existsByUserIdAndWorkoutIdAndStatus(
                USER_ID,
                WORKOUT_ID,
                WorkoutSessionStatus.IN_PROGRESS
        )).thenReturn(true);

        assertThatThrownBy(() -> workoutSessionService.startSession(authenticatedUser, WORKOUT_ID, null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("There is already an active session for this workout");
    }

    @Test
    void listWorkoutSessionsShouldReturnOnlyOwnedWorkoutSessions() throws Exception {
        User user = buildUser();
        Workout workout = buildWorkout(user);
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);
        WorkoutSession session = buildSession(user, workout);

        when(workoutRepository.findByIdAndUserIdAndDeletedAtIsNull(WORKOUT_ID, USER_ID))
                .thenReturn(Optional.of(workout));
        when(workoutSessionRepository.findAllByUserIdAndWorkoutIdOrderByStartedAtDesc(USER_ID, WORKOUT_ID))
                .thenReturn(List.of(session));

        List<WorkoutSessionResponseDTO> response = workoutSessionService.listWorkoutSessions(
                authenticatedUser,
                WORKOUT_ID
        );

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().workoutId()).isEqualTo(WORKOUT_ID);
    }

    @Test
    void finishSessionShouldUpdateInProgressSession() throws Exception {
        User user = buildUser();
        Workout workout = buildWorkout(user);
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);
        WorkoutSession session = buildSession(user, workout);
        FinishWorkoutSessionRequestDTO request = new FinishWorkoutSessionRequestDTO(
                LocalDateTime.of(2026, 6, 4, 21, 0),
                3600,
                60,
                "Treino concluido"
        );

        when(workoutSessionRepository.findByIdAndUserId(SESSION_ID, USER_ID))
                .thenReturn(Optional.of(session));

        WorkoutSessionResponseDTO response = workoutSessionService.finishSession(
                authenticatedUser,
                SESSION_ID,
                request
        );

        assertThat(response.status()).isEqualTo(WorkoutSessionStatus.FINISHED);
        assertThat(response.durationSeconds()).isEqualTo(3600);
        assertThat(response.xpEarned()).isEqualTo(60);
    }

    @Test
    void finishSessionShouldFailWhenSessionDoesNotBelongToUser() throws Exception {
        User user = buildUser();
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);

        when(workoutSessionRepository.findByIdAndUserId(SESSION_ID, USER_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> workoutSessionService.finishSession(authenticatedUser, SESSION_ID, null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Workout session not found");
    }

    @Test
    void cancelSessionShouldCancelInProgressSession() throws Exception {
        User user = buildUser();
        Workout workout = buildWorkout(user);
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);
        WorkoutSession session = buildSession(user, workout);

        when(workoutSessionRepository.findByIdAndUserId(SESSION_ID, USER_ID))
                .thenReturn(Optional.of(session));

        WorkoutSessionResponseDTO response = workoutSessionService.cancelSession(authenticatedUser, SESSION_ID);

        assertThat(response.status()).isEqualTo(WorkoutSessionStatus.CANCELLED);
        assertThat(response.xpEarned()).isZero();
    }

    private WorkoutSession buildSession(User user, Workout workout) throws Exception {
        WorkoutSession session = new WorkoutSession(
                user,
                workout,
                LocalDateTime.of(2026, 6, 4, 20, 0),
                null
        );
        setField(session, "id", SESSION_ID);

        return session;
    }

    private Workout buildWorkout(User user) throws Exception {
        Workout workout = new Workout(user, "Treino A", "Treino de teste", "Hipertrofia", "Iniciante", 4);
        setField(workout, "id", WORKOUT_ID);

        return workout;
    }

    private User buildUser() throws Exception {
        User user = new User("Lucas Affonso", "lucas.teste@example.com", "encoded-password");
        setField(user, "id", USER_ID);

        return user;
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
