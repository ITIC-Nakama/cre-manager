package com.itic.paris.platform.shared.pagination;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class StablePageableArgumentResolverTest {

    @SuppressWarnings("unused")
    private static void endpoint(Pageable pageable) {
    }

    private Pageable resolve(String query) throws NoSuchMethodException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        for (String pair : query.isEmpty() ? new String[0] : query.split("&")) {
            String[] kv = pair.split("=", 2);
            request.addParameter(kv[0], kv[1]);
        }
        Method method = StablePageableArgumentResolverTest.class.getDeclaredMethod("endpoint", Pageable.class);
        StablePageableArgumentResolver resolver = new StablePageableArgumentResolver(new PageableHandlerMethodArgumentResolver());
        return (Pageable) resolver.resolveArgument(new MethodParameter(method, 0), null, new ServletWebRequest(request), null);
    }

    @Test
    @DisplayName("A request with no sort ends up sorted by id")
    void unsortedRequestGetsIdOrder() throws NoSuchMethodException {
        Pageable resolved = resolve("page=1&size=15");

        assertThat(resolved.getSort().toList()).extracting(Sort.Order::getProperty).containsExactly("id");
        assertThat(resolved.getPageNumber()).isEqualTo(1);
        assertThat(resolved.getPageSize()).isEqualTo(15);
    }

    @Test
    @DisplayName("The client's sort stays first and id is appended")
    void clientSortIsKeptFirst() throws NoSuchMethodException {
        Pageable resolved = resolve("sort=lastName,desc");

        assertThat(resolved.getSort().toList()).extracting(Sort.Order::getProperty).containsExactly("lastName", "id");
        assertThat(resolved.getSort().getOrderFor("lastName").getDirection()).isEqualTo(Sort.Direction.DESC);
    }

    @Test
    @DisplayName("An id already requested is not repeated")
    void existingIdIsNotRepeated() throws NoSuchMethodException {
        Pageable resolved = resolve("sort=id,desc");

        assertThat(resolved.getSort().toList()).extracting(Sort.Order::getProperty).containsExactly("id");
        assertThat(resolved.getSort().getOrderFor("id").getDirection()).isEqualTo(Sort.Direction.DESC);
    }

    @Test
    @DisplayName("Spring Data's page size limit still applies")
    void pageSizeLimitStillApplies() throws NoSuchMethodException {
        assertThat(resolve("size=100000").getPageSize()).isLessThanOrEqualTo(2000);
        assertThat(PageRequest.of(0, 1).getSort().isUnsorted()).isTrue();
    }
}
