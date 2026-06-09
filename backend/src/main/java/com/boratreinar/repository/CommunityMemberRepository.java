package com.boratreinar.repository;

import com.boratreinar.model.CommunityMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommunityMemberRepository extends JpaRepository<CommunityMember, UUID> {

    List<CommunityMember> findAllByUserIdAndCommunityIdIn(UUID userId, Collection<UUID> communityIds);

    Optional<CommunityMember> findByCommunityIdAndUserId(UUID communityId, UUID userId);

    boolean existsByCommunityIdAndUserId(UUID communityId, UUID userId);

    long countByCommunityId(UUID communityId);

    void deleteByCommunityIdAndUserId(UUID communityId, UUID userId);
}
