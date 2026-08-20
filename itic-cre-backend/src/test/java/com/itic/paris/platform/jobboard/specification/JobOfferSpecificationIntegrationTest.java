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
                JobOfferSpecification.activeWithFilters("Java", null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompany()).isEqualTo("BNP Paribas");
    }

    @Test
    @DisplayName("Should retrieve all offers including inactive when using withSearch")
    void testWithSearchAll() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withSearch("Générale"),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompany()).isEqualTo("Société Générale");
    }

    @Test
    @DisplayName("Should filter all offers (active and inactive) by contract type only")
    void testWithSearchAndContractTypeFilterByContractTypeOnly() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withSearchAndContractType(null, cdi.getId()),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent())
                .extracting(JobOffer::getCompany)
                .containsExactlyInAnyOrder("BNP Paribas", "Société Générale");
    }

    @Test
    @DisplayName("Should combine search and contract type filters")
    void testWithSearchAndContractTypeCombined() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withSearchAndContractType("Java", cdi.getId()),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompany()).isEqualTo("BNP Paribas");
    }

    @Test
    @DisplayName("Should exclude offers of a different contract type")
    void testWithSearchAndContractTypeExcludesOtherContractType() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withSearchAndContractType(null, cdd.getId()),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompany()).isEqualTo("Capgemini");
    }

    @Test
    @DisplayName("Should filter to only active offers when active=true")
    void testWithSearchAndFiltersActiveTrue() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withSearchAndFilters(null, null, null, true),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent())
                .extracting(JobOffer::getCompany)
                .containsExactlyInAnyOrder("BNP Paribas", "Capgemini");
    }

    @Test
    @DisplayName("Should filter to only inactive offers when active=false")
    void testWithSearchAndFiltersActiveFalse() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withSearchAndFilters(null, null, null, false),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCompany()).isEqualTo("Société Générale");
    }

    @Test
    @DisplayName("Should return all offers regardless of active state when active param is null")
    void testWithSearchAndFiltersActiveNullReturnsAll() {
        Page<JobOffer> result = jobOfferRepository.findAll(
                JobOfferSpecification.withSearchAndFilters(null, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(3);
    }
}
