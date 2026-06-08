package com.itic.paris.platform.auth.service.helpers;

import com.itic.paris.platform.auth.core.exception.entity.CustomResponseEntity;
import com.itic.paris.platform.shared.local.MessageKey;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;

import java.util.Map;
import java.util.stream.Collectors;

public final class ValidationHelper {

    private ValidationHelper() {
    }

    public static ResponseEntity<CustomResponseEntity> buildValidationResponse(BindingResult bindingResult, String lang) {
        Map<String, String> errors = bindingResult.getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        FieldError::getDefaultMessage,
                        (existing, replacement) -> existing
                ));

        return ResponseEntity.badRequest()
                .body(CustomResponseEntity.of(MessageKey.VALIDATION_FAILED, lang, HttpStatus.BAD_REQUEST.value(), errors));
    }
}
