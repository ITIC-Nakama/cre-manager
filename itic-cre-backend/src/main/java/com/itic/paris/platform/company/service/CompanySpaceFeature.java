package com.itic.paris.platform.company.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.model.mapper.UserMapper;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Lot 10 (C) : interrupteur de l'Espace entreprise ({@code APP_COMPANY_SPACE_ENABLED}, coupé par défaut).
 * <ul>
 *   <li>coupé : pages et API publiques en 404, back-office réservé aux admins (403 pour un conseiller), aucun menu ;</li>
 *   <li>allumé : comportement d'avant le lot 10.</li>
 * </ul>
 * La configuration des formations (mots-clés, promotions, codes ROME, fiche formation) sert en coulisses quel que soit
 * l'interrupteur : rattachement des étudiants, alertes, vue par formation, récapitulatif, sources d'offres.
 */
@Component
@RequiredArgsConstructor
public class CompanySpaceFeature {

    @Value("${app.company-space.enabled:false}")
    private boolean enabled;

    private final UserRepository userRepository;

    public boolean isEnabled() {
        return enabled;
    }

    /** Pages et API publiques destinées aux entreprises : 404 tant que l'espace est masqué. */
    public void requirePublicAccess() {
        if (!enabled) {
            throw new AppException(HttpStatus.NOT_FOUND, MessageKey.COMPANY_SPACE_NOT_FOUND);
        }
    }

    /** Back-office : espace masqué, seuls les admins y accèdent (par l'adresse directe) ; 403 pour un conseiller. */
    public void requireBackOfficeAccess() {
        if (enabled) {
            return;
        }
        boolean admin = userRepository.findById(SecurityContextHelper.currentUserId())
                .map(u -> UserMapper.roleOf(u) == RoleEnum.ADMIN).orElse(false);
        if (!admin) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.COMPANY_SPACE_HIDDEN);
        }
    }
}
