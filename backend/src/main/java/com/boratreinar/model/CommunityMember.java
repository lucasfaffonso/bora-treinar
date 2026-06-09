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
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "community_members")
public class CommunityMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "community_id", nullable = false)
    private Community community;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "member_role", nullable = false, length = 40)
    private CommunityMemberRole memberRole = CommunityMemberRole.MEMBER;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    protected CommunityMember() {
    }

    public CommunityMember(Community community, User user, CommunityMemberRole memberRole) {
        this.community = community;
        this.user = user;
        this.memberRole = memberRole == null ? CommunityMemberRole.MEMBER : memberRole;
    }

    @PrePersist
    public void prePersist() {
        this.joinedAt = LocalDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public Community getCommunity() {
        return community;
    }

    public User getUser() {
        return user;
    }

    public CommunityMemberRole getMemberRole() {
        return memberRole;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }
}
