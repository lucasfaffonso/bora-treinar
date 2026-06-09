package com.boratreinar.service;

import com.boratreinar.dto.user.CurrentUserResponseDTO;
import com.boratreinar.exception.ResourceNotFoundException;
import com.boratreinar.model.User;
import com.boratreinar.repository.UserRepository;
import com.boratreinar.security.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Mock
    private UserRepository userRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository);
    }

    @Test
    void getCurrentUserShouldReturnAuthenticatedUserData() throws Exception {
        User user = buildUser();
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));

        CurrentUserResponseDTO response = userService.getCurrentUser(authenticatedUser);

        assertThat(response.id()).isEqualTo(USER_ID);
        assertThat(response.name()).isEqualTo("Lucas Affonso");
        assertThat(response.email()).isEqualTo("lucas.teste@example.com");
        assertThat(response.enabled()).isTrue();
        assertThat(response.emailVerified()).isFalse();
    }

    @Test
    void getCurrentUserShouldFailWhenUserDoesNotExist() throws Exception {
        User user = buildUser();
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(user);

        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getCurrentUser(authenticatedUser))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Authenticated user not found");
    }

    private User buildUser() throws Exception {
        User user = new User("Lucas Affonso", "lucas.teste@example.com", "encoded-password");
        setField(user, "id", USER_ID);

        return user;
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
