package com.itic.paris.platform.auth.core.exception;

import com.itic.paris.platform.auth.core.exception.entity.CustomResponseEntity;
import com.itic.paris.platform.shared.local.LanguageUtil;
import com.itic.paris.platform.shared.local.MessageKey;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AppException.class)
    public ResponseEntity<CustomResponseEntity> handleAppException(AppException ex, HttpServletRequest request) {
        String lang = LanguageUtil.resolveLang(request);
        MessageKey key = ex.getMessageKey();
        return ResponseEntity.status(ex.getStatus())
                .body(CustomResponseEntity.of(key, lang, ex.getStatus().value(), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<CustomResponseEntity> handleValidationErrors(MethodArgumentNotValidException ex,
                                                                        HttpServletRequest request) {
        String lang = LanguageUtil.resolveLang(request);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(CustomResponseEntity.of(MessageKey.VALIDATION_FAILED, lang, HttpStatus.BAD_REQUEST.value(),
                        buildFieldErrors(ex)));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<CustomResponseEntity> handleConstraintViolation(ConstraintViolationException ex,
                                                                         HttpServletRequest request) {
        String lang = LanguageUtil.resolveLang(request);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(CustomResponseEntity.of(MessageKey.VALIDATION_FAILED, lang, HttpStatus.BAD_REQUEST.value(),
                        buildConstraintViolationErrors(ex)));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<CustomResponseEntity> handleDataIntegrityViolation(DataIntegrityViolationException ex,
                                                                            HttpServletRequest request) {
        String lang = LanguageUtil.resolveLang(request);
        String property = extractUniqueConstraintField(ex);
        if ("label".equals(property)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(CustomResponseEntity.of(MessageKey.VALIDATION_FAILED, lang, HttpStatus.BAD_REQUEST.value(),
                            List.of(Map.of(
                                    "property", "label",
                                    "message", MessageKey.CONTRACT_TYPE_LABEL_ALREADY_EXISTS.translate(lang)
                            ))));
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(CustomResponseEntity.of(MessageKey.REQUEST_PROCESSING_FAILED, lang, HttpStatus.BAD_REQUEST.value(),
                        Map.of("error", ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage())));
    }

    @ExceptionHandler(TransactionSystemException.class)
    public ResponseEntity<CustomResponseEntity> handleTransactionSystemException(TransactionSystemException ex,
                                                                                 HttpServletRequest request) {
        Throwable cause = ex.getRootCause();
        if (cause instanceof ConstraintViolationException cve) {
            return handleConstraintViolation(cve, request);
        }
        String lang = LanguageUtil.resolveLang(request);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(CustomResponseEntity.of(MessageKey.REQUEST_PROCESSING_FAILED, lang,
                        HttpStatus.INTERNAL_SERVER_ERROR.value(), null));
    }

    private List<Map<String, String>> buildFieldErrors(MethodArgumentNotValidException ex) {
        List<Map<String, String>> errors = new ArrayList<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.add(Map.of(
                        "field", error.getField(),
                        "message", error.getDefaultMessage()
                )));
        ex.getBindingResult().getGlobalErrors().forEach(error ->
                errors.add(Map.of(
                        "object", error.getObjectName(),
                        "message", error.getDefaultMessage()
                )));
        return errors;
    }

    private List<Map<String, String>> buildConstraintViolationErrors(ConstraintViolationException ex) {
        return ex.getConstraintViolations().stream()
                .map(violation -> Map.of(
                        "property", violation.getPropertyPath().toString(),
                        "message", violation.getMessage()
                ))
                .toList();
    }

    private String extractUniqueConstraintField(DataIntegrityViolationException ex) {
        Throwable root = ex.getRootCause();
        String message = root != null ? root.getMessage() : ex.getMessage();
        if (message == null) {
            return null;
        }

        String lower = message.toLowerCase();
        if (lower.contains("key (label)")) {
            return "label";
        }
        return null;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<CustomResponseEntity> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
                                                                              HttpServletRequest request) {
        String lang = LanguageUtil.resolveLang(request);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(CustomResponseEntity.of(MessageKey.INVALID_REQUEST_BODY, lang, HttpStatus.BAD_REQUEST.value(),
                        Map.of("error", ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage())));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<CustomResponseEntity> handleAccessDenied(AccessDeniedException ex,
                                                                   HttpServletRequest request) {
        String lang = LanguageUtil.resolveLang(request);
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(CustomResponseEntity.of(MessageKey.ACCESS_DENIED, lang, HttpStatus.FORBIDDEN.value(), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<CustomResponseEntity> handleUnexpectedException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {} {}", request.getMethod(), request.getRequestURI(), ex);
        String lang = LanguageUtil.resolveLang(request);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(CustomResponseEntity.of(MessageKey.REQUEST_PROCESSING_FAILED, lang,
                        HttpStatus.INTERNAL_SERVER_ERROR.value(), null));
    }
}
