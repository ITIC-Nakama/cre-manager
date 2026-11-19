package com.itic.paris.platform.jobboard;

import com.itic.paris.platform.jobboard.external.provider.FranceTravailProvider;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Lot 10 (D) : V63 rend la liste des types de contrat complète (CDI, CDD, Alternance, Stage, Job étudiant), sans
 * doublon même rejouée, sans toucher aux types dont dépend la synchronisation. Le script de la migration est exécuté
 * tel quel (les tests tournent sur H2, sans Flyway).
 */
@SpringBootTest
@Transactional
class ContractTypesMigrationIntegrationTest {

    private static final List<String> REQUIRED = List.of("CDI", "CDD", "Alternance", "Stage", "Job étudiant");

    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private ContractTypeRepository contractTypeRepository;

    @BeforeEach
    void h2Compatibility() {
        try {
            jdbc.execute("CREATE ALIAS IF NOT EXISTS gen_random_uuid FOR \"java.util.UUID.randomUUID\"");
        } catch (Exception alreadyBuiltIn) {
            // gen_random_uuid existe déjà dans cette version de H2.
        }
    }

    @Test
    @DisplayName("Sans « Job étudiant » : ajouté ; les cinq types présents une fois chacun, même après deux passages")
    void addsMissingTypesOnce() throws Exception {
        jdbc.update("DELETE FROM contract_types WHERE lower(label) LIKE 'job%'");
        runMigration();
        runMigration();
        for (String label : REQUIRED) {
            assertThat(countLabel(label)).as(label).isEqualTo(1);
        }
        assertThat(jdbc.queryForObject("SELECT active FROM contract_types WHERE label = 'Job étudiant'", Boolean.class)).isTrue();
    }

    @Test
    @DisplayName("« Job Etudiant » créé à la main (comme en prod) : orthographe corrigée, même identifiant, aucun doublon")
    void fixesTheExistingNearDuplicate() throws Exception {
        jdbc.update("DELETE FROM contract_types WHERE lower(label) LIKE 'job%'");
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO contract_types (id, label, description, active, created_at, updated_at) VALUES (?, 'Job Etudiant', NULL, true, ?, ?)",
                id, java.sql.Timestamp.from(Instant.now()), java.sql.Timestamp.from(Instant.now()));
        runMigration();
        runMigration();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM contract_types WHERE lower(label) LIKE 'job%'", Long.class)).isEqualTo(1L);
        assertThat(jdbc.queryForObject("SELECT label FROM contract_types WHERE id = ?", String.class, id)).isEqualTo("Job étudiant");
    }

    @Test
    @DisplayName("Types de la synchronisation inchangés (libellé et identifiant) ; France Travail classe toujours l'apprentissage en Alternance")
    void syncTypesUntouched() throws Exception {
        List<ContractType> before = contractTypeRepository.findAll().stream()
                .filter(t -> List.of("CDI", "CDD", "Stage", "Alternance", "Inconnu").contains(t.getLabel())).toList();
        runMigration();
        for (ContractType t : before) {
            assertThat(contractTypeRepository.findById(t.getId()).orElseThrow().getLabel()).isEqualTo(t.getLabel());
        }
        assertThat(countLabel("Inconnu")).isEqualTo(1);
        assertThat(FranceTravailProvider.contractTypeLabel("Contrat apprentissage", "Développeur web H/F", "CDD - 24 Mois"))
                .isEqualTo("Alternance");
        assertThat(FranceTravailProvider.contractTypeLabel("Cont. professionnalisation", "Assistant RH", "CDD")).isEqualTo("Alternance");
    }

    private void runMigration() throws Exception {
        // Connexion de la transaction du test (rendue, jamais fermée) : le script voit et annule les mêmes données.
        Connection c = org.springframework.jdbc.datasource.DataSourceUtils.getConnection(dataSource);
        try {
            ScriptUtils.executeSqlScript(c, new ClassPathResource("db/migration/V63__contract_types_job_etudiant.sql"));
        } finally {
            org.springframework.jdbc.datasource.DataSourceUtils.releaseConnection(c, dataSource);
        }
    }

    private long countLabel(String label) {
        return jdbc.queryForObject("SELECT count(*) FROM contract_types WHERE label = ?", Long.class, label);
    }
}
