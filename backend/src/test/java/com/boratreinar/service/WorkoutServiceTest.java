package com.boratreinar.service;

import com.boratreinar.dto.workout.WorkoutExerciseRequestDTO;
import com.boratreinar.dto.workout.WorkoutRequestDTO;
import com.boratreinar.dto.workout.WorkoutResponseDTO;
import com.boratreinar.exception.ResourceNotFoundException;
import com.boratreinar.model.User;
import com.boratreinar.model.Workout;
import com.boratreinar.repository.UserRepository;
import com.boratreinar.repository.WorkoutRepository;
import com.boratreinar.security.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
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
class WorkoutServiceTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID WORKOUT_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Mock
    private WorkoutRepository workoutRepository;

    @Mock
    private UserRepository userRepository;

    private WorkoutService workoutService;

    @BeforeEach
    void setUp() {
        workoutService = new WorkoutService(workoutRepository, userRepository);
    }

    @Test
    void createWorkoutShouldSaveWorkoutForAuthenticatedUser() throws Exception {
        User user = buildUser();
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);
        WorkoutRequestDTO request = buildRequest("Treino A");

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(workoutRepository.save(any(Workout.class))).thenAnswer(invocation -> {
            Workout workout = invocation.getArgument(0);
            setField(workout, "id", WORKOUT_ID);
            return workout;
        });

        WorkoutResponseDTO response = workoutService.createWorkout(authenticatedUser, request);

        ArgumentCaptor<Workout> workoutCaptor = ArgumentCaptor.forClass(Workout.class);
        verify(workoutRepository).save(workoutCaptor.capture());

        Workout savedWorkout = workoutCaptor.getValue();
        assertThat(savedWorkout.getUser().getId()).isEqualTo(USER_ID);
        assertThat(savedWorkout.getName()).isEqualTo("Treino A");
        assertThat(savedWorkout.getExercises()).hasSize(1);
        assertThat(response.id()).isEqualTo(WORKOUT_ID);
        assertThat(response.name()).isEqualTo("Treino A");
        assertThat(response.exercises()).hasSize(1);
    }

    @Test
    void listWorkoutsShouldReturnOnlyAuthenticatedUserWorkouts() throws Exception {
        User user = buildUser();
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);
        Workout workout = buildWorkout(user, "Treino A");

        when(workoutRepository.findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(USER_ID))
                .thenReturn(List.of(workout));

        List<WorkoutResponseDTO> response = workoutService.listWorkouts(authenticatedUser);

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().name()).isEqualTo("Treino A");
    }

    @Test
    void getWorkoutShouldFailWhenWorkoutDoesNotBelongToAuthenticatedUser() throws Exception {
        User user = buildUser();
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);

        when(workoutRepository.findByIdAndUserIdAndDeletedAtIsNull(WORKOUT_ID, USER_ID))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> workoutService.getWorkout(authenticatedUser, WORKOUT_ID))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Workout not found");
    }

    @Test
    void updateWorkoutShouldReplaceWorkoutDataAndExercises() throws Exception {
        User user = buildUser();
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);
        Workout workout = buildWorkout(user, "Treino antigo");
        WorkoutRequestDTO request = buildRequest("Treino atualizado");

        when(workoutRepository.findByIdAndUserIdAndDeletedAtIsNull(WORKOUT_ID, USER_ID))
                .thenReturn(Optional.of(workout));

        WorkoutResponseDTO response = workoutService.updateWorkout(authenticatedUser, WORKOUT_ID, request);

        assertThat(response.name()).isEqualTo("Treino atualizado");
        assertThat(workout.getName()).isEqualTo("Treino atualizado");
        assertThat(workout.getExercises()).hasSize(1);
    }

    @Test
    void deleteWorkoutShouldSoftDeleteOwnedWorkout() throws Exception {
        User user = buildUser();
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);
        Workout workout = buildWorkout(user, "Treino A");

        when(workoutRepository.findByIdAndUserIdAndDeletedAtIsNull(WORKOUT_ID, USER_ID))
                .thenReturn(Optional.of(workout));

        workoutService.deleteWorkout(authenticatedUser, WORKOUT_ID);

        assertThat(workout.getActive()).isFalse();
        assertThat(workout.getDeletedAt()).isNotNull();
    }

    private WorkoutRequestDTO buildRequest(String name) {
        WorkoutExerciseRequestDTO exercise = new WorkoutExerciseRequestDTO(
                "Supino reto",
                1,
                3,
                "12",
                90,
                "Controlar movimento"
        );

        return new WorkoutRequestDTO(
                name,
                "Treino de teste",
                "Hipertrofia",
                "Iniciante",
                4,
                List.of(exercise)
        );
    }

    private Workout buildWorkout(User user, String name) throws Exception {
        Workout workout = new Workout(user, name, "Treino de teste", "Hipertrofia", "Iniciante", 4);
        workout.replaceExercises(List.of());
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
