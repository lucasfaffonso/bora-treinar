package com.boratreinar.controller;

import com.boratreinar.dto.auth.AuthResponseDTO;
import com.boratreinar.dto.auth.LoginRequestDTO;
import com.boratreinar.dto.auth.RegisterRequestDTO;
import com.boratreinar.dto.auth.UserSummaryDTO;
import com.boratreinar.exception.GlobalExceptionHandler;
import com.boratreinar.model.SubscriptionStatus;
import com.boratreinar.model.UserRole;
import com.boratreinar.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SuppressWarnings("null")
@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    private ObjectMapper objectMapper;

    @Mock
    private AuthService authService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        AuthController authController = new AuthController(authService);

        mockMvc = MockMvcBuilders
                .standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void registerShouldReturnCreatedWhenRequestIsValid() throws Exception {
        AuthResponseDTO response = buildAuthResponse();

        when(authService.register(any(RegisterRequestDTO.class))).thenReturn(response);

        RegisterRequestDTO request = new RegisterRequestDTO(
                "Lucas Affonso",
                "lucas.teste@example.com",
                "Senha12345"
        );

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("User registered successfully"))
                .andExpect(jsonPath("$.data.accessToken").value("jwt-token"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.user.email").value("lucas.teste@example.com"));

        verify(authService).register(any(RegisterRequestDTO.class));
    }

    @Test
    void registerShouldReturnBadRequestWhenRequestIsInvalid() throws Exception {
        RegisterRequestDTO request = new RegisterRequestDTO("", "invalid-email", "123");

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errors").isArray());
    }

    @Test
    void loginShouldReturnOkWhenRequestIsValid() throws Exception {
        AuthResponseDTO response = buildAuthResponse();

        when(authService.login(any(LoginRequestDTO.class))).thenReturn(response);

        LoginRequestDTO request = new LoginRequestDTO(
                "lucas.teste@example.com",
                "Senha12345"
        );

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Login successful"))
                .andExpect(jsonPath("$.data.accessToken").value("jwt-token"))
                .andExpect(jsonPath("$.data.user.email").value("lucas.teste@example.com"));

        verify(authService).login(any(LoginRequestDTO.class));
    }

    @Test
    void loginShouldReturnBadRequestWhenRequestIsInvalid() throws Exception {
        LoginRequestDTO request = new LoginRequestDTO("invalid-email", "");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errors").isArray());
    }

    private AuthResponseDTO buildAuthResponse() {
        UserSummaryDTO user = new UserSummaryDTO(
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "Lucas Affonso",
                "lucas.teste@example.com",
                UserRole.USER,
                SubscriptionStatus.FREE,
                false
        );

        return AuthResponseDTO.bearer("jwt-token", 3600000L, user);
    }
}
