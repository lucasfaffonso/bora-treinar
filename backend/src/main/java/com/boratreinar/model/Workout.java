package com.boratreinar.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workouts")
public class Workout {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 140)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 80)
    private String goal;

    @Column(nullable = false, length = 60)
    private String level;

    @Column(name = "weekly_frequency")
    private Integer weeklyFrequency;

    @Column(nullable = false, length = 40)
    private String source = "MANUAL";

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @OrderBy("exerciseOrder ASC")
    @OneToMany(mappedBy = "workout", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkoutExercise> exercises = new ArrayList<>();

    protected Workout() {
    }

    public Workout(User user, String name, String description, String goal, String level, Integer weeklyFrequency) {
        this.user = user;
        update(name, description, goal, level, weeklyFrequency);
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

    public void update(String name, String description, String goal, String level, Integer weeklyFrequency) {
        this.name = name;
        this.description = description;
        this.goal = goal;
        this.level = level;
        this.weeklyFrequency = weeklyFrequency;
    }

    public void replaceExercises(List<WorkoutExercise> newExercises) {
        exercises.clear();
        newExercises.forEach(this::addExercise);
    }

    public void addExercise(WorkoutExercise exercise) {
        exercise.setWorkout(this);
        exercises.add(exercise);
    }

    public void softDelete() {
        this.active = false;
        this.deletedAt = LocalDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getGoal() {
        return goal;
    }

    public String getLevel() {
        return level;
    }

    public Integer getWeeklyFrequency() {
        return weeklyFrequency;
    }

    public String getSource() {
        return source;
    }

    public Boolean getActive() {
        return active;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    public List<WorkoutExercise> getExercises() {
        return exercises;
    }
}
