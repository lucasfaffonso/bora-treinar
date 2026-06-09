package com.boratreinar.controller;

import com.boratreinar.dto.common.ApiResponseDTO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/health")
public class HealthController {

    @GetMapping
    public ApiResponseDTO<Map<String, Object>> health() {
        return ApiResponseDTO.success(
                "Backend is running",
                Map.of(
                        "status", "UP",
                        "service", "bora-treinar-backend",
                        "timestamp", LocalDateTime.now().toString()
                )
        );
    }
}
