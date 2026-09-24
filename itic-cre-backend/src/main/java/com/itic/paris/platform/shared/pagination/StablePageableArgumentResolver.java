package com.itic.paris.platform.shared.pagination;

import org.springframework.core.MethodParameter;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Ajoute l'id comme dernier critere de tri a tout Pageable recu d'une requete HTTP : la pagination
 * (une requete SQL par page) reste coherente meme quand le tri demande a des egalites, ou qu'il n'y en
 * a aucun (voir StablePageable). Ne touche pas aux Pageable crees en interne par les services.
 */
public class StablePageableArgumentResolver implements HandlerMethodArgumentResolver {

    private static final Sort ID_TIE_BREAKER = Sort.by("id");

    private final PageableHandlerMethodArgumentResolver delegate;

    public StablePageableArgumentResolver(PageableHandlerMethodArgumentResolver delegate) {
        this.delegate = delegate;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return delegate.supportsParameter(parameter);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        Pageable resolved = delegate.resolveArgument(parameter, mavContainer, webRequest, binderFactory);
        return StablePageable.withTieBreakers(resolved, ID_TIE_BREAKER);
    }
}
