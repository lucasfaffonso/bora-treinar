package com.boratreinar.controller;

import com.boratreinar.dto.common.ApiResponseDTO;
import com.boratreinar.dto.community.CommunityResponseDTO;
import com.boratreinar.security.AuthenticatedUser;
import com.boratreinar.service.CommunityService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/communities")
public class CommunityController {

    private final CommunityService communityService;

    public CommunityController(CommunityService communityService) {
        this.communityService = communityService;
    }

    @GetMapping
    public ApiResponseDTO<List<CommunityResponseDTO>> listCommunities(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser
    ) {
        return ApiResponseDTO.success(
                "Communities retrieved successfully",
                communityService.listCommunities(authenticatedUser)
        );
    }

    @GetMapping("/{communityId}")
    public ApiResponseDTO<CommunityResponseDTO> getCommunity(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable UUID communityId
    ) {
        return ApiResponseDTO.success(
                "Community retrieved successfully",
                communityService.getCommunity(authenticatedUser, communityId)
        );
    }

    @PostMapping("/{communityId}/join")
    public ApiResponseDTO<CommunityResponseDTO> joinCommunity(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable UUID communityId
    ) {
        return ApiResponseDTO.success(
                "Community joined successfully",
                communityService.joinCommunity(authenticatedUser, communityId)
        );
    }

    @DeleteMapping("/{communityId}/leave")
    public ApiResponseDTO<CommunityResponseDTO> leaveCommunity(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            @PathVariable UUID communityId
    ) {
        return ApiResponseDTO.success(
                "Community left successfully",
                communityService.leaveCommunity(authenticatedUser, communityId)
        );
    }
}
