package com.boratreinar.dto.common;

import java.util.List;

public record ErrorResponseDTO(
        Boolean success,
        String timestamp,
        Integer status,
        String error,
        String message,
        String path,
        List<FieldErrorDTO> errors
) {
}
