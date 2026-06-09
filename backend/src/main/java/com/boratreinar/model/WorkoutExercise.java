package com.boratreinar.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "workout_exercises")
public class WorkoutExercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workout_id", nullable = false)
    private Workout workout;

    @Column(name = "exercise_name", nullable = false, length = 140)
    private String exerciseName;

    @Column(name = "exercise_order", nullable = false)
    private Integer exerciseOrder;

    @Column(nullable = false)
    private Integer sets;

    @Column(nullable = false, length = 60)
    private String reps;

    @Column(name = "rest_seconds")
    private Integer restSeconds;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected WorkoutExercise() {
    }

    public WorkoutExercise(
            String exerciseName,
            Integer exerciseOrder,
            Integer sets,
            String reps,
            Integer restSeconds,
            String notes
    ) {
        this.exerciseName = exerciseName;
        this.exerciseOrder = exerciseOrder;
        this.sets = sets;
        this.reps = reps;
        this.restSeconds = restSeconds;
        this.notes = notes;
    }

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    void setWorkout(Workout workout) {
        this.workout = workout;
    }

    public UUID getId() {
        return id;
    }

    public Workout getWorkout() {
        return workout;
    }

    public String getExerciseName() {
        return exerciseName;
    }

    public Integer getExerciseOrder() {
        return exerciseOrder;
    }

    public Integer getSets() {
        return sets;
    }

    public String getReps() {
        return reps;
    }

    public Integer getRestSeconds() {
        return restSeconds;
    }

    public String getNotes() {
        return notes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
