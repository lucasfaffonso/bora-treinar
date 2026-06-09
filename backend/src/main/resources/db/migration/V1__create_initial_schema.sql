CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'USER',
    subscription_status VARCHAR(40) NOT NULL DEFAULT 'FREE',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITHOUT TIME ZONE NULL
);

CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(140) NOT NULL,
    muscle_group VARCHAR(80) NOT NULL,
    equipment VARCHAR(100) NULL,
    instructions TEXT NULL,
    created_by_user_id UUID NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITHOUT TIME ZONE NULL,
    CONSTRAINT fk_exercises_created_by_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users (id)
);

CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(140) NOT NULL,
    description TEXT NULL,
    goal VARCHAR(80) NOT NULL,
    level VARCHAR(60) NOT NULL,
    weekly_frequency INTEGER NULL,
    source VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITHOUT TIME ZONE NULL,
    CONSTRAINT fk_workouts_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
);

CREATE TABLE workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL,
    exercise_id UUID NULL,
    exercise_name VARCHAR(140) NOT NULL,
    exercise_order INTEGER NOT NULL,
    sets INTEGER NOT NULL,
    reps VARCHAR(60) NOT NULL,
    rest_seconds INTEGER NULL,
    notes TEXT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workout_exercises_workout
        FOREIGN KEY (workout_id)
        REFERENCES workouts (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_workout_exercises_exercise
        FOREIGN KEY (exercise_id)
        REFERENCES exercises (id)
);

CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workout_id UUID NULL,
    started_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITHOUT TIME ZONE NULL,
    duration_seconds INTEGER NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'IN_PROGRESS',
    xp_earned INTEGER NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workout_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users (id),
    CONSTRAINT fk_workout_sessions_workout
        FOREIGN KEY (workout_id)
        REFERENCES workouts (id)
);

CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NULL,
    visibility VARCHAR(40) NOT NULL DEFAULT 'PUBLIC',
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITHOUT TIME ZONE NULL,
    CONSTRAINT fk_communities_owner_user
        FOREIGN KEY (owner_user_id)
        REFERENCES users (id)
);

CREATE TABLE community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL,
    user_id UUID NOT NULL,
    member_role VARCHAR(40) NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_community_members_community
        FOREIGN KEY (community_id)
        REFERENCES communities (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_community_members_user
        FOREIGN KEY (user_id)
        REFERENCES users (id),
    CONSTRAINT uk_community_members_unique_member
        UNIQUE (community_id, user_id)
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_workouts_user_id ON workouts (user_id);
CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises (workout_id);
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions (user_id);
CREATE INDEX idx_workout_sessions_workout_id ON workout_sessions (workout_id);
CREATE INDEX idx_communities_owner_user_id ON communities (owner_user_id);
CREATE INDEX idx_community_members_community_id ON community_members (community_id);
CREATE INDEX idx_community_members_user_id ON community_members (user_id);
