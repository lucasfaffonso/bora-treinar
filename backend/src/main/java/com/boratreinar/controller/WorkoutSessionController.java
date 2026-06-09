package com.boratreinar.controller;

import com.boratreinar.dto.common.ApiResponseDTO;
import com.boratreinar.dto.workoutsession.FinishWorkoutSessionRequestDTO;
import com.boratreinar.dto.workoutsession.StartWorkoutSessionRequestDTO;
import com.boratreinar.dto.workoutsession.WorkoutSessionResponseDTO;
import com.boratreinar.security.AuthenticatedUser;
import com.boratreinar.service.WorkoutSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping
public class WorkoutSessionController {

    private final WorkoutSessionService workoutSessionService;

    public WorkoutSessionController(WorkoutSessionService workoutSessionService) {
        this.workoutSessionService = workoutSessionService;
    }

    @PostMapping("/workouts/{workoutId}/sessions")
    public ResponseEntity<ApiResponseDTO<WorkoutSessionResponseDTO>> startSession(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable UUID workoutId,
            @Valid @RequestBody(required = false) StartWorkoutSessionRequestDTO request
    ) {
        WorkoutSessionResponseDTO response = workoutSessionService.startSession(
                authenticatedUser,
                workoutId,
                request
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Workout session started successfully", response));
    }

    @GetMapping("/workouts/{workoutId}/sessions")
    public ApiResponseDTO<List<WorkoutSessionResponseDTO>> listWorkoutSessions(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable UUID workoutId
    ) {
        return ApiResponseDTO.success(
                "Workout sessions retrieved successfully",
                workoutSessionService.listWorkoutSessions(authenticatedUser, workoutId)
        );
    }

    @GetMapping("/workout-sessions")
    public ApiResponseDTO<List<WorkoutSessionResponseDTO>> listSessions(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser
    ) {
        return ApiResponseDTO.success(
                "Workout sessions retrieved successfully",
                workoutSessionService.listSessions(authenticatedUser)
        );
    }

    @GetMapping("/workout-sessions/{sessionId}")
    public ApiResponseDTO<WorkoutSessionResponseDTO> getSession(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable UUID sessionId
    ) {
        return ApiResponseDTO.success(
                "Workout session retrieved successfully",
                workoutSessionService.getSession(authenticatedUser, sessionId)
        );
    }

    @PatchMapping("/workout-sessions/{sessionId}/finish")
    public ApiResponseDTO<WorkoutSessionResponseDTO> finishSession(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable UUID sessionId,
            @Valid @RequestBody(required = false) FinishWorkoutSessionRequestDTO request
    ) {
        return ApiResponseDTO.success(
                "Workout session finished successfully",
                workoutSessionService.finishSession(authenticatedUser, sessionId, request)
        );
    }

    @PatchMapping("/workout-sessions/{sessionId}/cancel")
    public ApiResponseDTO<WorkoutSessionResponseDTO> cancelSession(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable UUID sessionId
    ) {
        return ApiResponseDTO.success(
                "Workout session cancelled successfully",
                workoutSessionService.cancelSession(authenticatedUser, sessionId)
        );
    }
}
