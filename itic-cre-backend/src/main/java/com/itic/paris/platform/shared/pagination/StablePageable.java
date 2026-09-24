package com.itic.paris.platform.shared.pagination;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class StablePageable {

    private StablePageable() {}

    /**
     * Ajoute au tri demande les criteres de departage absents, sans jamais modifier l'ordre principal.
     * Sans departage, des lignes a egalite (ex: beaucoup d'offres a 0 candidature) peuvent changer de
     * place d'une requete a l'autre, et le defilement infini (une requete par page) affiche alors un
     * element deux fois ou en saute un. Le dernier critere doit etre unique (l'id).
     */
    public static Pageable withTieBreakers(Pageable pageable, Sort tieBreakers) {
        if (pageable.isUnpaged()) {
            return pageable;
        }
        Sort sort = pageable.getSort();
        for (Sort.Order order : tieBreakers) {
            if (sort.getOrderFor(order.getProperty()) == null) {
                sort = sort.and(Sort.by(order));
            }
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);
    }
}
