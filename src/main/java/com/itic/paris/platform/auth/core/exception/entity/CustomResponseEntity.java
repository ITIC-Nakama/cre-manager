package com.itic.paris.platform.auth.core.exception.entity;

import com.itic.paris.platform.auth.core.locale.MessageKey;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CustomResponseEntity {

    private String messageKey;
    private String message;
    private Integer statusCode;
    private Object data;

    public static CustomResponseEntity of(MessageKey key, String lang, int statusCode, Object data) {
        return CustomResponseEntity.builder()
                .messageKey(key.getKey())
                .message(key.translate(lang))
                .statusCode(statusCode)
                .data(data)
                .build();
    }
}
