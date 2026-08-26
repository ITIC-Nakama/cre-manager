package com.itic.paris.platform.crm.service;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.repository.ApplicationHistoryRepository;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Prouve le mécanisme anti-course lui-même (verrou optimiste @Version), pas seulement
 * la règle métier séquentielle déjà couverte par ApplicationServiceIntegrationTest.
 * Sans @Transactional de classe : chaque étape gère sa propre transaction via
 * TransactionTemplate pour simuler deux requêtes concurrentes qui chargent la même
 * candidature avant qu'aucune des deux n'ait committé.
 */
@SpringBootTest
public class ApplicationStatusConcurrencyIntegrationTest {

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationHistoryRepository historyRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private ContractTypeRepository contractTypeRepository;

    @Autowired
    private ApplicationStatusRepository statusRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate txTemplate;
    private UUID studentId;
    private UUID applicationId;

    @BeforeEach
    public void setUp() {
        txTemplate = new TransactionTemplate(transactionManager);
        txTemplate.executeWithoutResult(status -> {
            Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
            Student student = new Student();
            student.setEmail("concurrency.student@itic.fr");
            student.setFirstName("Concurrency");
            student.setLastName("Tester");
            student.setPassword("Secret123!");
            student.setEmailVerified(true);
            student.setMustChangePassword(false);
            student.setRole(studentRole);
            student.setXpTotal(0);
            student = studentRepository.save(student);
            studentId = student.getId();

            ContractType cdi = contractTypeRepository.findByLabel("CDI")
                    .orElseThrow(() -> new IllegalStateException("Seeded CDI contract type not found"));
            ApplicationStatus aPostuler = statusRepository.findByOrdre(1)
                    .orElseThrow(() -> new IllegalStateException("Seeded status 'À postuler' not found"));

            Application app = new Application();
            app.setStudent(student);
            app.setEntreprise("Concurrency Corp");
            app.setPoste("Race Condition Tester");
            app.setTypeContrat(cdi);
            app.setStatus(aPostuler);
            app = applicationRepository.save(app);
            applicationId = app.getId();
        });
    }

    @AfterEach
    public void tearDown() {
        txTemplate.executeWithoutResult(status -> {
            historyRepository.deleteByApplicationId(applicationId);
            applicationRepository.deleteById(applicationId);
            studentRepository.deleteById(studentId);
        });
    }

    @Test
    public void testConcurrentStatusChange_StaleWriteFailsInsteadOfSilentlyOverwriting() {
        // Deux "requêtes" chargent la candidature avant qu'aucune des deux ne committe —
        // exactement le scénario d'un double-clic ou d'un retry réseau.
        Application requestA = txTemplate.execute(status ->
                applicationRepository.findById(applicationId).orElseThrow());
        Application requestB = txTemplate.execute(status ->
                applicationRepository.findById(applicationId).orElseThrow());

        assertThat(requestA.getVersion()).isEqualTo(requestB.getVersion());

        ApplicationStatus postule = statusRepository.findByOrdre(2)
                .orElseThrow(() -> new IllegalStateException("Seeded status 'Postulé' not found"));

        // La première requête committe son changement normalement.
        txTemplate.executeWithoutResult(status -> {
            requestA.setStatus(postule);
            applicationRepository.saveAndFlush(requestA);
        });

        // La seconde, partie du même état initial (version obsolète), doit échouer
        // au lieu d'écraser silencieusement le changement de la première.
        assertThatThrownBy(() -> txTemplate.executeWithoutResult(status -> {
            requestB.setStatus(postule);
            applicationRepository.saveAndFlush(requestB);
        })).isInstanceOf(ObjectOptimisticLockingFailureException.class);

        // Le statut final reflète uniquement le changement qui a réellement committé.
        Application finalState = txTemplate.execute(status ->
                applicationRepository.findById(applicationId).orElseThrow());
        assertThat(finalState.getStatus().getId()).isEqualTo(postule.getId());
    }
}
