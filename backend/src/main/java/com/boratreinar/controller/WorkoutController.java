package com.boratreinar.controller;

import com.boratreinar.dto.common.ApiResponseDTO;
import com.boratreinar.dto.workout.WorkoutRequestDTO;
import com.boratreinar.dto.workout.WorkoutResponseDTO;
import com.boratreinar.security.AuthenticatedUser;
import com.boratreinar.service.WorkoutService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/workouts")
public class WorkoutController {

    private final WorkoutService workoutService;

    public WorkoutController(WorkoutService workoutService) {
        this.workoutService = workoutService;
    }

    @PostMapping
    public ResponseEntity<ApiResponseDTO<WorkoutResponseDTO>> createWorkout(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @Valid @RequestBody WorkoutRequestDTO request
    ) {
        WorkoutResponseDTO response = workoutService.createWorkout(authenticatedUser, request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("Workout created successfully", response));
    }

    @GetMapping
    public ApiResponseDTO<List<WorkoutResponseDTO>> listWorkouts(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser
    ) {
        return ApiResponseDTO.success(
                "Workouts retrieved successfully",
                workoutService.listWorkouts(authenticatedUser)
        );
    }

    @GetMapping("/{workoutId}")
    public ApiResponseDTO<WorkoutResponseDTO> getWorkout(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable UUID workoutId
    ) {
        return ApiResponseDTO.success(
                "Workout retrieved successfully",
                workoutService.getWorkout(authenticatedUser, workoutId)
        );
    }

    @PutMapping("/{workoutId}")
    public ApiResponseDTO<WorkoutResponseDTO> updateWorkout(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable UUID workoutId,
            @Valid @RequestBody WorkoutRequestDTO request
    ) {
        return ApiResponseDTO.success(
                "Workout updated successfully",
                workoutService.updateWorkout(authenticatedUser, workoutId, request)
        );
    }

    @DeleteMapping("/{workoutId}")
    public ApiResponseDTO<Void> deleteWorkout(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable UUID workoutId
    ) {
        workoutService.deleteWorkout(authenticatedUser, workoutId);

        return ApiResponseDTO.success("Workout deleted successfully");
    }
}
