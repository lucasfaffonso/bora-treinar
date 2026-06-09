package com.boratreinar.service;

import com.boratreinar.dto.community.CommunityResponseDTO;
import com.boratreinar.exception.ResourceNotFoundException;
import com.boratreinar.model.Community;
import com.boratreinar.model.CommunityMember;
import com.boratreinar.model.CommunityMemberRole;
import com.boratreinar.model.CommunityVisibility;
import com.boratreinar.model.User;
import com.boratreinar.repository.CommunityMemberRepository;
import com.boratreinar.repository.CommunityRepository;
import com.boratreinar.repository.UserRepository;
import com.boratreinar.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CommunityService {

    private final CommunityRepository communityRepository;
    private final CommunityMemberRepository communityMemberRepository;
    private final UserRepository userRepository;

    public CommunityService(
            CommunityRepository communityRepository,
            CommunityMemberRepository communityMemberRepository,
            UserRepository userRepository
    ) {
        this.communityRepository = communityRepository;
        this.communityMemberRepository = communityMemberRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public List<CommunityResponseDTO> listCommunities(AuthenticatedUser authenticatedUser) {
        User user = getActiveUser(authenticatedUser.getId());

        ensureDefaultCommunities(user);

        List<Community> communities = communityRepository
                .findAllByDeletedAtIsNullAndVisibilityOrderByCreatedAtAsc(CommunityVisibility.PUBLIC);

        Set<UUID> joinedCommunityIds = communityMemberRepository.findAllByUserIdAndCommunityIdIn(
                        user.getId(),
                        communities.stream().map(Community::getId).toList()
                )
                .stream()
                .map(member -> member.getCommunity().getId())
                .collect(Collectors.toSet());

        return communities.stream()
                .map(community -> toResponse(community, joinedCommunityIds.contains(community.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public CommunityResponseDTO getCommunity(AuthenticatedUser authenticatedUser, UUID communityId) {
        User user = getActiveUser(authenticatedUser.getId());
        Community community = getVisibleCommunity(communityId);
        boolean joined = communityMemberRepository.existsByCommunityIdAndUserId(community.getId(), user.getId());

        return toResponse(community, joined);
    }

    @Transactional
    public CommunityResponseDTO joinCommunity(AuthenticatedUser authenticatedUser, UUID communityId) {
        User user = getActiveUser(authenticatedUser.getId());
        Community community = getVisibleCommunity(communityId);

        if (!communityMemberRepository.existsByCommunityIdAndUserId(community.getId(), user.getId())) {
            communityMemberRepository.save(new CommunityMember(
                    community,
                    user,
                    CommunityMemberRole.MEMBER
            ));
        }

        return toResponse(community, true);
    }

    @Transactional
    public CommunityResponseDTO leaveCommunity(AuthenticatedUser authenticatedUser, UUID communityId) {
        User user = getActiveUser(authenticatedUser.getId());
        Community community = getVisibleCommunity(communityId);

        communityMemberRepository.deleteByCommunityIdAndUserId(community.getId(), user.getId());

        return toResponse(community, false);
    }

    private void ensureDefaultCommunities(User owner) {
        if (communityRepository.existsByDeletedAtIsNull()) {
            return;
        }

        List<Community> defaults = List.of(
                new Community(
                        owner,
                        "Constância da semana",
                        "Desafio público para manter ritmo e registrar sessões ao longo da semana.",
                        CommunityVisibility.PUBLIC,
                        false
                ),
                new Community(
                        owner,
                        "Hipertrofia e força",
                        "Grupo para usuários focados em evolução de carga, volume e progressão.",
                        CommunityVisibility.PUBLIC,
                        false
                ),
                new Community(
                        owner,
                        "Primeiros treinos",
                        "Comunidade para iniciantes que precisam de organização, segurança e motivação.",
                        CommunityVisibility.PUBLIC,
                        false
                ),
                new Community(
                        owner,
                        "Ranking entre amigos",
                        "Espaço social para competir por constância e acompanhar evolução em grupo.",
                        CommunityVisibility.PUBLIC,
                        false
                )
        );

        communityRepository.saveAll(defaults);
    }

    private CommunityResponseDTO toResponse(Community community, boolean joined) {
        return CommunityResponseDTO.from(
                community,
                joined,
                communityMemberRepository.countByCommunityId(community.getId())
        );
    }

    private Community getVisibleCommunity(UUID communityId) {
        return communityRepository.findByIdAndDeletedAtIsNull(communityId)
                .filter(Community::isVisibleToUsers)
                .orElseThrow(() -> new ResourceNotFoundException("Community not found"));
    }

    private User getActiveUser(UUID userId) {
        return userRepository.findById(userId)
                .filter(User::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }
}
