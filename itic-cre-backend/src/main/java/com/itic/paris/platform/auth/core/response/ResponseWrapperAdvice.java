package com.itic.paris.platform.auth.core.response;

import com.itic.paris.platform.auth.core.exception.entity.CustomResponseEntity;
import com.itic.paris.platform.auth.core.locale.LanguageUtil;
import com.itic.paris.platform.auth.core.locale.MessageKey;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@RestControllerAdvice(basePackages = {
        "com.itic.paris.platform.auth.controller",
        "com.itic.paris.platform.audit.controller"
})
public class ResponseWrapperAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class selectedConverterType, ServerHttpRequest request, ServerHttpResponse response) {
        if (isSwaggerPath(request) || body instanceof CustomResponseEntity) {
            return body;
        }

        int statusCode = HttpStatus.OK.value();
        if (response instanceof ServletServerHttpResponse servletResponse && servletResponse.getServletResponse() != null) {
            statusCode = servletResponse.getServletResponse().getStatus();
        }

        String lang = resolveLang(request);
        MessageKey key = statusCode >= 400 ? MessageKey.ERROR : MessageKey.SUCCESS;
        return CustomResponseEntity.of(key, lang, statusCode, body);
    }

    private boolean isSwaggerPath(ServerHttpRequest request) {
        String path = request.getURI().getPath();
        return path.contains("/swagger-ui") || path.contains("/v3/api-docs");
    }

    private String resolveLang(ServerHttpRequest request) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            HttpServletRequest httpRequest = servletRequest.getServletRequest();
            return LanguageUtil.resolveLang(httpRequest);
        }
        return "fr";
    }
}
