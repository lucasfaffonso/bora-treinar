CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS communities (
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

CREATE TABLE IF NOT EXISTS community_members (
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

CREATE INDEX IF NOT EXISTS idx_communities_owner_user_id ON communities (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members (community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members (user_id);
