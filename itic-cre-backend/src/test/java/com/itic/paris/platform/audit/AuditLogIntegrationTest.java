package com.itic.paris.platform.audit;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.model.AuditLog;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.AdvisorRepository;
import com.itic.paris.platform.auth.repository.RoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class AuditLogIntegrationTest {

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private AdvisorRepository advisorRepository;

    @Autowired
    private RoleRepository roleRepository;

    private Advisor adminActor;

    @BeforeEach
    public void setUp() {
        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);

        adminActor = new Advisor();
        adminActor.setEmail("admin.audit@itic.fr");
        adminActor.setFirstName("Admin");
        adminActor.setLastName("Audit");
        adminActor.setPassword("Secret123!");
        adminActor.setEmailVerified(true);
        adminActor.setRole(adminRole);
        adminActor = advisorRepository.save(adminActor);
    }

    @Test
    public void testLogEventAndRetrieve() {
        UUID targetId = UUID.randomUUID();
        auditLogService.log(AuditAction.STAFF_USER_CREATED, adminActor, targetId, "Création d'un nouvel utilisateur staff");

        Page<AuditLog> page = auditLogService.findAll(PageRequest.of(0, 10));
        assertThat(page.getContent()).isNotEmpty();

        AuditLog logEntry = page.getContent().stream()
                .filter(l -> targetId.equals(l.getTargetId()))
                .findFirst()
                .orElseThrow();

        assertThat(logEntry.getAction()).isEqualTo(AuditAction.STAFF_USER_CREATED);
        assertThat(logEntry.getActorEmail()).isEqualTo("admin.audit@itic.fr");
        assertThat(logEntry.getDescription()).contains("Création d'un nouvel utilisateur staff");
    }

    @Test
    public void testFilterAuditLogsByAction() {
        UUID targetId1 = UUID.randomUUID();
        UUID targetId2 = UUID.randomUUID();

        auditLogService.log(AuditAction.LOGIN, adminActor, targetId1, "Connexion réussie");
        auditLogService.log(AuditAction.CV_VALIDATED, adminActor, targetId2, "Validation de CV");

        Page<AuditLog> filtered = auditLogService.findAll(AuditAction.CV_VALIDATED, null, null, null, PageRequest.of(0, 10));
        assertThat(filtered.getContent()).isNotEmpty();
        assertThat(filtered.getContent().stream().allMatch(l -> l.getAction() == AuditAction.CV_VALIDATED)).isTrue();
    }
}
