package com.boratreinar.service;

import com.boratreinar.dto.auth.AuthResponseDTO;
import com.boratreinar.dto.auth.LoginRequestDTO;
import com.boratreinar.dto.auth.RegisterRequestDTO;
import com.boratreinar.exception.BusinessException;
import com.boratreinar.exception.UnauthorizedException;
import com.boratreinar.model.User;
import com.boratreinar.repository.UserRepository;
import com.boratreinar.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String ACCESS_TOKEN = "jwt-token";
    private static final long EXPIRATION = 3600000L;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void registerShouldCreateUserAndReturnToken() {
        RegisterRequestDTO request = new RegisterRequestDTO(
                "Lucas Affonso",
                "Lucas.Teste@Example.com",
                "Senha12345"
        );
        User savedUser = new User("Lucas Affonso", "lucas.teste@example.com", "encoded-password");

        when(userRepository.existsByEmailIgnoreCase("lucas.teste@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Senha12345")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateAccessToken(savedUser)).thenReturn(ACCESS_TOKEN);
        when(jwtService.getExpirationMillis()).thenReturn(EXPIRATION);

        AuthResponseDTO response = authService.register(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());

        User userToSave = userCaptor.getValue();
        assertThat(userToSave.getName()).isEqualTo("Lucas Affonso");
        assertThat(userToSave.getEmail()).isEqualTo("lucas.teste@example.com");
        assertThat(userToSave.getPasswordHash()).isEqualTo("encoded-password");
        assertThat(response.accessToken()).isEqualTo(ACCESS_TOKEN);
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(EXPIRATION);
        assertThat(response.user().email()).isEqualTo("lucas.teste@example.com");
    }

    @Test
    void registerShouldFailWhenEmailAlreadyExists() {
        RegisterRequestDTO request = new RegisterRequestDTO(
                "Lucas Affonso",
                "lucas.teste@example.com",
                "Senha12345"
        );

        when(userRepository.existsByEmailIgnoreCase("lucas.teste@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Email is already registered");

        verify(userRepository, never()).save(any(User.class));
        verify(passwordEncoder, never()).encode(any(String.class));
    }

    @Test
    void loginShouldReturnTokenWhenCredentialsAreValid() {
        LoginRequestDTO request = new LoginRequestDTO("Lucas.Teste@Example.com", "Senha12345");
        User user = new User("Lucas Affonso", "lucas.teste@example.com", "encoded-password");

        when(userRepository.findByEmailIgnoreCase("lucas.teste@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Senha12345", "encoded-password")).thenReturn(true);
        when(jwtService.generateAccessToken(user)).thenReturn(ACCESS_TOKEN);
        when(jwtService.getExpirationMillis()).thenReturn(EXPIRATION);

        AuthResponseDTO response = authService.login(request);

        assertThat(response.accessToken()).isEqualTo(ACCESS_TOKEN);
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.user().email()).isEqualTo("lucas.teste@example.com");
    }

    @Test
    void loginShouldFailWhenUserDoesNotExist() {
        LoginRequestDTO request = new LoginRequestDTO("missing@example.com", "Senha12345");

        when(userRepository.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid email or password");

        verify(passwordEncoder, never()).matches(any(String.class), any(String.class));
    }

    @Test
    void loginShouldFailWhenPasswordIsInvalid() {
        LoginRequestDTO request = new LoginRequestDTO("lucas.teste@example.com", "wrong-password");
        User user = new User("Lucas Affonso", "lucas.teste@example.com", "encoded-password");

        when(userRepository.findByEmailIgnoreCase("lucas.teste@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "encoded-password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid email or password");

        verify(jwtService, never()).generateAccessToken(any(User.class));
    }
}
