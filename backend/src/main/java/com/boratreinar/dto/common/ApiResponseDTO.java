package com.boratreinar.dto.common;

public record ApiResponseDTO<T>(
        Boolean success,
        String message,
        T data
) {

    public static <T> ApiResponseDTO<T> success(String message, T data) {
        return new ApiResponseDTO<>(true, message, data);
    }

    public static <T> ApiResponseDTO<T> success(String message) {
        return new ApiResponseDTO<>(true, message, null);
    }
}
