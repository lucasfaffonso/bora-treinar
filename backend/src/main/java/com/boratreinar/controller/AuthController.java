package com.boratreinar.controller;

import com.boratreinar.dto.auth.AuthResponseDTO;
import com.boratreinar.dto.auth.LoginRequestDTO;
import com.boratreinar.dto.auth.RegisterRequestDTO;
import com.boratreinar.dto.common.ApiResponseDTO;
import com.boratreinar.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponseDTO<AuthResponseDTO>> register(
            @Valid @RequestBody RegisterRequestDTO request
    ) {
        AuthResponseDTO response = authService.register(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponseDTO.success("User registered successfully", response));
    }

    @PostMapping("/login")
    public ApiResponseDTO<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        return ApiResponseDTO.success("Login successful", authService.login(request));
    }
}
