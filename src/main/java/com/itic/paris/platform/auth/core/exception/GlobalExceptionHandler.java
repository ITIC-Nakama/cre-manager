package com.itic.paris.platform.auth.core.exception;

import com.itic.paris.platform.auth.core.exception.entity.CustomResponseEntity;
import com.itic.paris.platform.auth.core.locale.LanguageUtil;
import com.itic.paris.platform.auth.core.locale.MessageKey;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;

@RestControllerAdvice
public class GlobalExceptionHandler {

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
                        ex.getBindingResult().getAllErrors()));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<CustomResponseEntity> handleConstraintViolation(ConstraintViolationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new CustomResponseEntity(null, ex.getMessage(), HttpStatus.BAD_REQUEST.value(), null));
    }

    @ExceptionHandler(TransactionSystemException.class)
    public ResponseEntity<CustomResponseEntity> handleTransactionSystemException(TransactionSystemException ex,
                                                                                 HttpServletRequest request) {
        Throwable cause = ex.getRootCause();
        if (cause instanceof ConstraintViolationException cve) {
            return handleConstraintViolation(cve);
        }
        String lang = LanguageUtil.resolveLang(request);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(CustomResponseEntity.of(MessageKey.REQUEST_PROCESSING_FAILED, lang,
                        HttpStatus.INTERNAL_SERVER_ERROR.value(), null));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<CustomResponseEntity> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
                                                                              HttpServletRequest request) {
        String lang = LanguageUtil.resolveLang(request);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(CustomResponseEntity.of(MessageKey.INVALID_REQUEST_BODY, lang, HttpStatus.BAD_REQUEST.value(),
                        ex.getMostSpecificCause().getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<CustomResponseEntity> handleAccessDenied(AccessDeniedException ex,
                                                                   HttpServletRequest request) {
        String lang = LanguageUtil.resolveLang(request);
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(CustomResponseEntity.of(MessageKey.ACCESS_DENIED, lang, HttpStatus.FORBIDDEN.value(), null));
    }
}
