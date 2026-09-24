package com.itic.paris.platform.shared.pagination;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;

class StablePageableTest {

    private static final Sort TIE_BREAKERS = Sort.by(Sort.Direction.DESC, "effectiveDate").and(Sort.by("id"));

    @Test
    @DisplayName("Keeps the requested order first and appends the missing tie-breakers")
    void appendsMissingTieBreakersAfterRequestedOrder() {
        Pageable requested = PageRequest.of(2, 20, Sort.by(Sort.Direction.DESC, "applicationCount"));

        Pageable stable = StablePageable.withTieBreakers(requested, TIE_BREAKERS);

        assertThat(stable.getSort().toList()).extracting(Sort.Order::getProperty)
                .containsExactly("applicationCount", "effectiveDate", "id");
        assertThat(stable.getSort().getOrderFor("applicationCount").getDirection()).isEqualTo(Sort.Direction.DESC);
        assertThat(stable.getSort().getOrderFor("id").getDirection()).isEqualTo(Sort.Direction.ASC);
        assertThat(stable.getPageNumber()).isEqualTo(2);
        assertThat(stable.getPageSize()).isEqualTo(20);
    }

    @Test
    @DisplayName("Does not repeat a criterion already present, nor change its direction")
    void doesNotDuplicateExistingCriteria() {
        Pageable requested = PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "effectiveDate"));

        Pageable stable = StablePageable.withTieBreakers(requested, TIE_BREAKERS);

        assertThat(stable.getSort().toList()).extracting(Sort.Order::getProperty)
                .containsExactly("effectiveDate", "id");
        assertThat(stable.getSort().getOrderFor("effectiveDate").getDirection()).isEqualTo(Sort.Direction.ASC);
    }

    @Test
    @DisplayName("Adds the tie-breakers to an unsorted page request")
    void sortsAnUnsortedRequest() {
        Pageable stable = StablePageable.withTieBreakers(PageRequest.of(0, 5), TIE_BREAKERS);

        assertThat(stable.getSort().toList()).extracting(Sort.Order::getProperty)
                .containsExactly("effectiveDate", "id");
    }

    @Test
    @DisplayName("Leaves an unpaged request untouched")
    void leavesUnpagedRequestUntouched() {
        assertThat(StablePageable.withTieBreakers(Pageable.unpaged(), TIE_BREAKERS)).isSameAs(Pageable.unpaged());
    }
}
