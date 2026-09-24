package com.itic.paris.platform.shared.pagination;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.Pageable;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class StablePaginationWiringTest {

    @Autowired
    private RequestMappingHandlerAdapter handlerAdapter;

    @SuppressWarnings("unused")
    private static void endpointWithPageable(Pageable pageable) {
    }

    @Test
    @DisplayName("The first argument resolver to handle a Pageable is the stable one, not Spring Data's")
    void stableResolverIsTheFirstToHandlePageable() throws NoSuchMethodException {
        Method method = StablePaginationWiringTest.class.getDeclaredMethod("endpointWithPageable", Pageable.class);
        MethodParameter pageableParameter = new MethodParameter(method, 0);

        HandlerMethodArgumentResolver firstMatch = handlerAdapter.getArgumentResolvers().stream()
                .filter(resolver -> resolver.supportsParameter(pageableParameter))
                .findFirst()
                .orElseThrow();

        assertThat(firstMatch).isInstanceOf(StablePageableArgumentResolver.class);
    }
}
