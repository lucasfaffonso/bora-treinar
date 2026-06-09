package com.boratreinar.repository;

import com.boratreinar.model.Community;
import com.boratreinar.model.CommunityVisibility;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommunityRepository extends JpaRepository<Community, UUID> {

    List<Community> findAllByDeletedAtIsNullAndVisibilityOrderByCreatedAtAsc(CommunityVisibility visibility);

    Optional<Community> findByIdAndDeletedAtIsNull(UUID id);

    boolean existsByDeletedAtIsNull();
}
