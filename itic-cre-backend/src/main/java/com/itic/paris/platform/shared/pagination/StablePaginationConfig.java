package com.itic.paris.platform.shared.pagination;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * Passe en premier (HIGHEST_PRECEDENCE) pour prendre le pas sur le resolveur Pageable de Spring Data,
 * dont ce resolveur reprend le comportement (parametres page/size/sort, valeurs par defaut, limites).
 */
@Configuration
@Order(Ordered.HIGHEST_PRECEDENCE)
public class StablePaginationConfig implements WebMvcConfigurer {

    private final PageableHandlerMethodArgumentResolver springDataResolver;

    public StablePaginationConfig(PageableHandlerMethodArgumentResolver springDataResolver) {
        this.springDataResolver = springDataResolver;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new StablePageableArgumentResolver(springDataResolver));
    }
}
