package com.boratreinar.controller;

import com.boratreinar.dto.common.ApiResponseDTO;
import com.boratreinar.dto.user.CurrentUserResponseDTO;
import com.boratreinar.security.AuthenticatedUser;
import com.boratreinar.service.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ApiResponseDTO<CurrentUserResponseDTO> getCurrentUser(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser
    ) {
        return ApiResponseDTO.success(
                "Current user retrieved successfully",
                userService.getCurrentUser(authenticatedUser)
        );
    }
}
