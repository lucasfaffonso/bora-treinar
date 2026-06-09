package com.boratreinar.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "workout_sessions")
public class WorkoutSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_id")
    private Workout workout;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private WorkoutSessionStatus status = WorkoutSessionStatus.IN_PROGRESS;

    @Column(name = "xp_earned", nullable = false)
    private Integer xpEarned = 0;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected WorkoutSession() {
    }

    public WorkoutSession(User user, Workout workout, LocalDateTime startedAt, String notes) {
        this.user = user;
        this.workout = workout;
        this.startedAt = startedAt == null ? LocalDateTime.now() : startedAt;
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

    public void finish(LocalDateTime finishedAt, Integer durationSeconds, Integer xpEarned, String notes) {
        LocalDateTime effectiveFinishedAt = finishedAt == null ? LocalDateTime.now() : finishedAt;

        this.finishedAt = effectiveFinishedAt;
        this.durationSeconds = resolveDurationSeconds(effectiveFinishedAt, durationSeconds);
        this.xpEarned = xpEarned == null ? calculateXp(this.durationSeconds) : Math.max(0, xpEarned);
        this.notes = notes;
        this.status = WorkoutSessionStatus.FINISHED;
    }

    public void cancel(String notes) {
        this.finishedAt = LocalDateTime.now();
        this.durationSeconds = resolveDurationSeconds(this.finishedAt, null);
        this.xpEarned = 0;
        this.notes = notes;
        this.status = WorkoutSessionStatus.CANCELLED;
    }

    public boolean isInProgress() {
        return status == WorkoutSessionStatus.IN_PROGRESS;
    }

    private Integer resolveDurationSeconds(LocalDateTime effectiveFinishedAt, Integer requestedDurationSeconds) {
        if (requestedDurationSeconds != null) {
            return Math.max(0, requestedDurationSeconds);
        }

        long seconds = Duration.between(startedAt, effectiveFinishedAt).toSeconds();

        return Math.toIntExact(Math.max(0, seconds));
    }

    private Integer calculateXp(Integer durationSeconds) {
        int safeDuration = durationSeconds == null ? 0 : Math.max(0, durationSeconds);

        return Math.max(0, safeDuration / 60);
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Workout getWorkout() {
        return workout;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public LocalDateTime getFinishedAt() {
        return finishedAt;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public WorkoutSessionStatus getStatus() {
        return status;
    }

    public Integer getXpEarned() {
        return xpEarned;
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
