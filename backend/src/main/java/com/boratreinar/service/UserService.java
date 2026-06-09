package com.boratreinar.service;

import com.boratreinar.dto.user.CurrentUserResponseDTO;
import com.boratreinar.exception.ResourceNotFoundException;
import com.boratreinar.model.User;
import com.boratreinar.repository.UserRepository;
import com.boratreinar.security.AuthenticatedUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public CurrentUserResponseDTO getCurrentUser(AuthenticatedUser authenticatedUser) {
        User user = userRepository.findById(authenticatedUser.getId())
                .filter(User::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));

        return CurrentUserResponseDTO.from(user);
    }
}
