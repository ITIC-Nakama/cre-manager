package com.itic.paris.platform.seeder;

import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVCommentaire;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftRequest;
import com.itic.paris.platform.cv.repository.CVCommentaireRepository;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.itic.paris.platform.cv.service.CvBuilderService;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Donnees de demo de l'assistant de CV (docs/CV_BUILDER_SPEC.md §10) — comptes fictifs, actifs
 * uniquement avec les seeders de test (app.test.seeders.enabled), comme les autres Test*Seeder.
 * <ul>
 *   <li>demo.assistant@itic.fr : sans CV, une candidature au contrat valide (montre le prerempli) ;</li>
 *   <li>demo.corriger@itic.fr : brouillon complet deja envoye, CV « À corriger » avec un commentaire.</li>
 * </ul>
 */
// TODO: SUPPRIMER CE SEEDER AVANT LA MISE EN PRODUCTION (comme les autres Test*Seeder)
@Slf4j
@Component
@Order(30) // Apres les statuts (3), les promotions (2), le conseiller et l'etudiant de test (21, 22)
@RequiredArgsConstructor
public class TestCvBuilderSeeder implements ApplicationRunner {

    static final String DEMO_NEW_EMAIL = "demo.assistant@itic.fr";
    static final String DEMO_TO_FIX_EMAIL = "demo.corriger@itic.fr";
    private static final String DEMO_PROMOTION = "Bachelor Dev 2025-2026";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PromotionRepository promotionRepository;
    private final ApplicationRepository applicationRepository;
    private final ApplicationStatusRepository applicationStatusRepository;
    private final ContractTypeRepository contractTypeRepository;
    private final CVRepository cvRepository;
    private final CVStatutRepository cvStatutRepository;
    private final CVCommentaireRepository cvCommentaireRepository;
    private final CvBuilderService cvBuilderService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.test.seeders.enabled:false}")
    private boolean enabled;

    @Value("${app.test.student.password:}")
    private String password;

    @Value("${app.test.advisor.email:test.advisor@itic.fr}")
    private String advisorEmail;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (!enabled || password == null || password.isBlank()) return;
        Role role = roleRepository.findByName(RoleEnum.STUDENT);
        if (role == null) return;
        User advisor = userRepository.findByEmailIgnoreCase(advisorEmail).orElse(null);

        if (!userRepository.existsByEmailIgnoreCase(DEMO_NEW_EMAIL)) {
            seedStudentWithoutCv(role, advisor);
        }
        if (!userRepository.existsByEmailIgnoreCase(DEMO_TO_FIX_EMAIL)) {
            seedStudentWithCvToFix(role, advisor);
        }
    }

    /** Sans CV : le prerempli reprend le compte, la promotion et la candidature au contrat valide. */
    private void seedStudentWithoutCv(Role role, User advisor) {
        Student student = newStudent(role, advisor, DEMO_NEW_EMAIL, "Inès", "Moreau", "06 11 22 33 44");

        Application application = new Application();
        application.setStudent(student);
        application.setEntreprise("Atelier Numérique (démo)");
        application.setPoste("Développeuse web en alternance");
        contractTypeRepository.findByLabel("Alternance").ifPresent(application::setTypeContrat);
        applicationStatusRepository.findFirstByCompteCommeContratTrue().ifPresent(application::setStatus);
        application.setStartDate(LocalDate.of(2025, 9, 1));
        application.setContractVerified(true);
        if (application.getStatus() != null) {
            applicationRepository.save(application);
        }
        log.info("Seeded CV builder demo student (sans CV) : {}", DEMO_NEW_EMAIL);
    }

    /** Brouillon complet envoye par le vrai chemin (submit), puis passe « À corriger » avec un commentaire. */
    private void seedStudentWithCvToFix(Role role, User advisor) throws Exception {
        Student student = newStudent(role, advisor, DEMO_TO_FIX_EMAIL, "Yanis", "Lefort", "06 55 66 77 88");

        CvDraftRequest request = new CvDraftRequest();
        request.setData(draftToFix());
        request.setTemplateCode("MODERNE");
        request.setAccentColor("#3B71FF");
        request.setCvLang("fr");
        cvBuilderService.submit(student.getId(), request);

        CV cv = cvRepository.findByStudentId(student.getId()).orElseThrow();
        cvStatutRepository.findAllByActifTrueOrderByOrdreAsc().stream()
                .filter(s -> s.getNom().toLowerCase().contains("corriger"))
                .findFirst()
                .ifPresent(statut -> {
                    cv.setStatut(statut);
                    cv.setUpdatedAt(Instant.now());
                    cvRepository.save(cv);
                });

        if (advisor != null) {
            CVCommentaire comment = new CVCommentaire();
            comment.setCv(cv);
            comment.setAdvisor(advisor);
            comment.setContenu("Bonne base ! Deux corrections avant validation : précise ton niveau d'anglais "
                    + "et ajoute un résultat chiffré à ton expérience chez Studio Pixel (ex. : nombre de pages intégrées).");
            cvCommentaireRepository.save(comment);
        }
        log.info("Seeded CV builder demo student (CV à corriger) : {}", DEMO_TO_FIX_EMAIL);
    }

    private Student newStudent(Role role, User advisor, String email, String firstName, String lastName, String phone) {
        Student student = new Student();
        student.setEmail(email);
        student.setFirstName(firstName);
        student.setLastName(lastName);
        student.setPhoneNumber(phone);
        student.setPassword(passwordEncoder.encode(password));
        student.setEmailVerified(true);
        student.setMustChangePassword(false);
        student.setRole(role);
        student.setPrivacyAccepted(true);
        student.setPrivacyAcceptedAt(Instant.now());
        student.setPrivacyPolicyVersion("1.0");
        student.setAdvisor(advisor);
        Promotion promotion = promotionRepository.findAll().stream()
                .filter(p -> DEMO_PROMOTION.equalsIgnoreCase(p.getName()))
                .findFirst().orElse(null);
        if (promotion != null) {
            student.setPromotion(promotion);
            student.setStudyYear(2);
        }
        return userRepository.save(student);
    }

    /** CV fictif volontairement perfectible : niveau d'anglais absent, expérience sans chiffre. */
    private static CvDraftData draftToFix() {
        CvDraftData data = new CvDraftData();
        CvDraftData.Identite id = data.getIdentite();
        id.setPrenom("Yanis");
        id.setNom("Lefort");
        id.setTitre("Développeur front-end en alternance");
        id.setEmail(DEMO_TO_FIX_EMAIL);
        id.setTelephone("06 55 66 77 88");
        id.setVille("Montreuil");
        id.setMobilite("Paris et petite couronne");
        CvDraftData.Lien github = new CvDraftData.Lien();
        github.setType("GITHUB");
        github.setUrl("https://github.com/yanis-lefort-demo");
        id.setLiens(new ArrayList<>(List.of(github)));
        data.setAccroche("Étudiant en 2e année de Bachelor Développement à ITIC Paris, je cherche une alternance "
                + "de 12 mois (rythme 3 jours entreprise / 2 jours école) pour créer des interfaces web soignées.");

        CvDraftData.Experience stage = new CvDraftData.Experience();
        stage.setId("demo-exp-1");
        stage.setPoste("Stagiaire intégrateur web");
        stage.setEntreprise("Studio Pixel");
        stage.setVille("Paris");
        stage.setTypeContrat("Stage");
        stage.setDebut("2025-04");
        stage.setFin("2025-06");
        stage.setPoints(new ArrayList<>(List.of(
                "Intégration de maquettes Figma en React et Tailwind",
                "Participation aux revues de code de l'équipe")));
        data.setExperiences(new ArrayList<>(List.of(stage)));

        CvDraftData.Formation bachelor = new CvDraftData.Formation();
        bachelor.setId("demo-for-1");
        bachelor.setDiplome(DEMO_PROMOTION);
        bachelor.setEtablissement("ITIC Paris");
        bachelor.setVille("Paris");
        bachelor.setDebut("2024-09");
        bachelor.setEnCours(true);
        data.setFormations(new ArrayList<>(List.of(bachelor)));

        CvDraftData.Projet projet = new CvDraftData.Projet();
        projet.setId("demo-pro-1");
        projet.setNom("Site vitrine d'une association sportive");
        projet.setDescription("Projet d'école en binôme : maquette, intégration responsive et mise en ligne.");
        projet.setTechnos(new ArrayList<>(List.of("HTML", "CSS", "JavaScript")));
        data.setProjets(new ArrayList<>(List.of(projet)));

        data.getCompetences().setTechniques(new ArrayList<>(List.of("React", "TypeScript", "Tailwind CSS", "HTML / CSS")));
        data.getCompetences().setOutils(new ArrayList<>(List.of("Git", "Figma", "VS Code")));
        data.getCompetences().setSavoirEtre(new ArrayList<>(List.of("Curiosité", "Sens du détail")));

        CvDraftData.Langue francais = new CvDraftData.Langue();
        francais.setLangue("Français");
        francais.setNiveau("NATIF");
        CvDraftData.Langue anglais = new CvDraftData.Langue();
        anglais.setLangue("Anglais");
        anglais.setNiveau("");
        data.setLangues(new ArrayList<>(List.of(francais, anglais)));

        data.setCentresInteret(new ArrayList<>(List.of("Photographie urbaine", "Jeux de société")));
        return data;
    }
}
