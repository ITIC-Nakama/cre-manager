package com.itic.paris.platform.jobboard.specification;

import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class JobOfferSpecificationIntegrationTest {

    @Autowired
    private JobOfferRepository jobOfferRepository;

    @Autowired
    private ContractTypeRepository contractTypeRepository;

    private ContractType cdi;
    private ContractType cdd;

    @BeforeEach
    void setUp() {
        jobOfferRepository.deleteAll();

        cdi = contractTypeRepository.findAll().stream().findFirst().orElseGet(() -> {
            ContractType ct = new ContractType();
            ct.setLabel("CDI");
            return contractTypeRepository.save(ct);
        });

        cdd = new ContractType();
        cdd.setLabel("CDD-Test");
        cdd = contractTypeRepository.save(cdd);

        JobOffer offer1 = new JobOffer();
        offer1.setTitle("Développeur Java Spring");
        offer1.setCompany("BNP Paribas");
        offer1.setDescription("Développement backend Java 21");
        offer1.setActive(true);
        offer1.setContractType(cdi);
        jobOfferRepository.save(offer1);

        JobOffer offer2 = new JobOffer();
        offer2.setTitle("Chef de Projet Digital");
        offer2.setCompany("Société Générale");
        offer2.setDescription("Gestion de projets informatiques");
        offer2.setActive(false);
        offer2.setContractType(cdi);
        jobOfferRepository.save(offer2);

        JobOffer offer3 = new JobOffer();
        offer3.setTitle("Assistant Marketing Digital");
        offer3.setCompany("Capgemini");
        offer3.setDescription("Poste en CDD");
        offer3.setActive(true);
        offer3.setContractType(cdd);
        jobOfferRepository.save(offer3);
    }

    @Test
    @DisplayName("Should filter active job offers by search term")
    void testActiveWithSearch() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.activeWithFilters("Java", null, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompany()).isEqualTo("BNP Paribas");
    }

    @Test
    @DisplayName("Should match a search term without accents against a title that has them")
    void testActiveWithSearchIsAccentInsensitive() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.activeWithFilters("developpeur", null, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompany()).isEqualTo("BNP Paribas");
    }

    @Test
    @DisplayName("Should match a multi-word search whose words appear in a different order in the title")
    void testActiveWithSearchMatchesMultipleWordsInAnyOrder() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.activeWithFilters("spring developpeur", null, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompany()).isEqualTo("BNP Paribas");
    }

    @Test
    @DisplayName("Should require every word of a multi-word search to match (AND, not OR)")
    void testActiveWithSearchRequiresAllWordsToMatch() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.activeWithFilters("developpeur digital", null, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    @DisplayName("Should filter all offers (active and inactive) by contract type only")
    void testAllFiltersByContractTypeOnly() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withAllFilters(null, cdi.getId(), null, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent())
                .extracting(JobOffer::getCompany)
                .containsExactlyInAnyOrder("BNP Paribas", "Société Générale");
    }

    @Test
    @DisplayName("Should combine search and contract type filters")
    void testAllFiltersSearchAndContractTypeCombined() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withAllFilters("Java", cdi.getId(), null, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompany()).isEqualTo("BNP Paribas");
    }

    @Test
    @DisplayName("Should exclude offers of a different contract type")
    void testAllFiltersExcludesOtherContractType() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withAllFilters(null, cdd.getId(), null, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompany()).isEqualTo("Capgemini");
    }

    @Test
    @DisplayName("Should filter to only active offers when active=true")
    void testAllFiltersActiveTrue() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withAllFilters(null, null, null, null, true, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent())
                .extracting(JobOffer::getCompany)
                .containsExactlyInAnyOrder("BNP Paribas", "Capgemini");
    }

    @Test
    @DisplayName("Should filter to only inactive offers when active=false")
    void testAllFiltersActiveFalse() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withAllFilters(null, null, null, null, false, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompany()).isEqualTo("Société Générale");
    }

    @Test
    @DisplayName("Should return all offers regardless of active state when active param is null")
    void testAllFiltersActiveNullReturnsAll() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withAllFilters(null, null, null, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(3);
    }
}
