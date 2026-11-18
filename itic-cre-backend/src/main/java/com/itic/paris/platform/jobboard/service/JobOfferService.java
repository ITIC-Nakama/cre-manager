package com.itic.paris.platform.jobboard.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.model.Sector;
import com.itic.paris.platform.jobboard.model.dtos.CreateJobOfferRequest;
import com.itic.paris.platform.jobboard.model.dtos.ContractTypeDTO;
import com.itic.paris.platform.jobboard.model.dtos.JobOfferDTO;
import com.itic.paris.platform.jobboard.model.dtos.OfferAuthorDTO;
import com.itic.paris.platform.jobboard.model.dtos.SectorDTO;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobApplicationRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.jobboard.repository.SectorRepository;
import com.itic.paris.platform.shared.pagination.StablePageable;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.itic.paris.platform.jobboard.specification.JobOfferSpecification ;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobOfferService {

    /** Departage des offres a egalite dans la liste de gestion (voir StablePageable). */
    private static final Sort OFFER_TIE_BREAKERS = Sort.by(Sort.Direction.DESC, "effectiveDate").and(Sort.by("id"));

    private final JobOfferRepository jobOfferRepository;
    private final ContractTypeRepository contractTypeRepository;
    private final SectorRepository sectorRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final com.itic.paris.platform.auth.repository.PromotionRepository promotionRepository;
    private final com.itic.paris.platform.alerts.service.OfferProgramService offerProgramService;
    private final com.itic.paris.platform.alerts.service.OfferAlertService offerAlertService;
    private final com.itic.paris.platform.matching.StudentFormationResolver formationResolver;
    private final com.itic.paris.platform.auth.repository.StudentRepository studentRepository;

    public JobOfferDTO create(CreateJobOfferRequest request) {
        ContractType contractType = contractTypeRepository.findById(request.getContractTypeId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CONTRACT_TYPE_NOT_FOUND));
        Sector sector = resolveSector(request.getSectorId());

        boolean draft = Boolean.TRUE.equals(request.getDraft());
        // Brouillon : le moyen de postuler n'est controle qu'a la publication.
        String emailCandidature = draft ? ApplicationEmailExtractor.extract(request.getDescription()) : requireApplyChannel(request);
        User createdBy = getCurrentUser();

        JobOffer jobOffer = new JobOffer();
        jobOffer.setTitle(request.getTitle());
        jobOffer.setCompany(request.getCompany());
        jobOffer.setDescription(request.getDescription());
        jobOffer.setLocation(request.getLocation());
        jobOffer.setContractType(contractType);
        jobOffer.setSector(sector);
        jobOffer.setExternalLink(request.getExternalLink());
        jobOffer.setEmailCandidature(emailCandidature);
        jobOffer.setActive(true);
        jobOffer.setCreatedBy(createdBy);
        jobOffer.setDraft(draft);
        jobOffer.setStaffPublishedAt(draft ? null : Instant.now());
        jobOffer.setTargetPromotions(resolvePromotions(request.getTargetPromotionIds()));

        JobOffer saved = jobOfferRepository.save(jobOffer);
        auditLogService.log(AuditAction.JOB_OFFER_CREATED, createdBy, "JOB_OFFER", saved.getId(),
                saved.getTitle() + " — " + saved.getCompany());
        java.util.Set<UUID> added = offerProgramService.setManualPrograms(saved.getId(), requestedPrograms(request));
        offerAlertService.enqueue(saved, added);
        return mapToDTO(saved);
    }

    /**
     * Une offre déposée par le staff doit offrir un moyen de postuler : un lien, ou une adresse
     * e-mail dans la description. Retourne l'adresse trouvée (null s'il n'y a qu'un lien).
     */
    private String requireApplyChannel(CreateJobOfferRequest request) {
        String emailCandidature = ApplicationEmailExtractor.extract(request.getDescription());
        boolean hasLink = request.getExternalLink() != null && !request.getExternalLink().isBlank();
        if (!hasLink && emailCandidature == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.JOB_OFFER_NO_APPLY_CHANNEL);
        }
        return emailCandidature;
    }

    /** Formations du formulaire : « Toutes les formations », ou la liste choisie (vide = aucune). */
    private java.util.List<UUID> requestedPrograms(CreateJobOfferRequest request) {
        if (Boolean.TRUE.equals(request.getAllPrograms())) {
            return offerProgramService.allProgramIds();
        }
        return request.getProgramIds() == null ? java.util.List.of() : request.getProgramIds();
    }

    /** Promotions ciblees : identifiants inconnus refuses (404). */
    private java.util.Set<com.itic.paris.platform.auth.model.Promotion> resolvePromotions(List<UUID> ids) {
        java.util.Set<com.itic.paris.platform.auth.model.Promotion> promotions = new java.util.HashSet<>();
        if (ids == null) {
            return promotions;
        }
        for (UUID id : new java.util.LinkedHashSet<>(ids)) {
            promotions.add(promotionRepository.findById(id)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.PROMOTION_NOT_FOUND)));
        }
        return promotions;
    }

    /**
     * Publier un brouillon : le moyen de postuler (lien ou adresse e-mail dans la description) est controle maintenant.
     * Une offre deja publiee reste publiee (sans effet).
     */
    public JobOfferDTO publish(UUID id) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));
        if (jobOffer.isDraft()) {
            String email = ApplicationEmailExtractor.extract(jobOffer.getDescription());
            boolean hasLink = jobOffer.getExternalLink() != null && !jobOffer.getExternalLink().isBlank();
            if (!hasLink && email == null) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.JOB_OFFER_NO_APPLY_CHANNEL);
            }
            jobOffer.setEmailCandidature(email);
            jobOffer.setDraft(false);
            jobOffer.setStaffPublishedAt(Instant.now());
            jobOfferRepository.save(jobOffer);
            auditLogService.log(AuditAction.JOB_OFFER_UPDATED, getCurrentUser(), "JOB_OFFER", jobOffer.getId(),
                    "Publication du brouillon : " + jobOffer.getTitle() + " — " + jobOffer.getCompany());
            // Publication : les étudiants de toutes les formations déjà rattachées sont prévenus.
            offerAlertService.enqueue(jobOffer, linkedPrograms(jobOffer.getId()));
        }
        return mapToDTO(jobOffer);
    }

    private static boolean isStaff() {
        try {
            String role = com.itic.paris.platform.auth.core.security.SecurityContextHelper.currentUserRole();
            return "ADVISOR".equals(role) || "ADMIN".equals(role);
        } catch (AppException e) {
            return false;
        }
    }

    private Sector resolveSector(UUID sectorId) {
        if (sectorId == null) {
            return null;
        }
        return sectorRepository.findById(sectorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.SECTOR_NOT_FOUND));
    }

    public JobOfferDTO getById(UUID id) {
        return jobOfferRepository.findById(id)
                // Un brouillon n'existe pas pour un etudiant.
                .filter(offer -> !offer.isDraft() || isStaff())
                .map(this::mapToDTO)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));
    }

    public Page<JobOfferDTO> getActiveOffers(String search, UUID contractTypeId, Pageable pageable) {
        return getActiveOffers(search, contractTypeId, null, pageable);
    }

    public Page<JobOfferDTO> getActiveOffers(String search, UUID contractTypeId, UUID sectorId, Pageable pageable) {
        return getActiveOffers(search, contractTypeId, sectorId, null, pageable);
    }

    public Page<JobOfferDTO> getActiveOffers(String search, UUID contractTypeId, UUID sectorId, String source, Pageable pageable) {
        return getActiveOffers(search, contractTypeId, sectorId, source, null, pageable);
    }

    public Page<JobOfferDTO> getActiveOffers(String search, UUID contractTypeId, UUID sectorId, String source, String location, Pageable pageable) {
        return getActiveOffers(search, contractTypeId, sectorId, source, location, null, false, pageable);
    }

    /**
     * Liste des étudiants (et de l'équipe), avec le filtre par formation (lot 8) : programIds, ou « Offres pour ma
     * formation » (myFormation=true : formations de l'étudiant connecté ; aucune formation = aucune offre).
     */
    public Page<JobOfferDTO> getActiveOffers(String search, UUID contractTypeId, UUID sectorId, String source, String location,
                                             java.util.Collection<UUID> programIds, boolean myFormation, Pageable pageable) {
        Specification<JobOffer> spec = JobOfferSpecification.activeWithFilters(search, contractTypeId, sectorId, source, location);
        java.util.Collection<UUID> programs = programIds;
        if (myFormation) {
            programs = myPrograms();
        }
        if (programs != null && (myFormation || !programs.isEmpty())) {
            spec = spec.and(JobOfferSpecification.withPrograms(programs.isEmpty() ? java.util.List.of(new UUID(0, 0)) : programs));
        }
        return mapPage(jobOfferRepository.findAll(spec, pageable));
    }

    /** Formations de l'étudiant connecté (promotion et année d'étude). */
    private java.util.List<UUID> myPrograms() {
        UUID me = com.itic.paris.platform.auth.core.security.SecurityContextHelper.currentUserId();
        return studentRepository.findById(me)
                .filter(s -> s.getPromotion() != null)
                .map(s -> com.itic.paris.platform.matching.StudentFormationResolver.programsFor(formationResolver.snapshot(),
                        s.getPromotion().getId(), s.getStudyYear()).stream().map(p -> p.getId()).toList())
                .orElse(java.util.List.of());
    }

    private java.util.Set<UUID> linkedPrograms(UUID offerId) {
        return offerProgramService.programsOf(java.util.List.of(offerId)).getOrDefault(offerId, java.util.List.of())
                .stream().map(com.itic.paris.platform.alerts.service.OfferProgramService.ProgramRef::id)
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));
    }

    /** Rattacher une offre à une formation à la main (onglet Formations) : alerte aux étudiants de la formation ajoutée. */
    public JobOfferDTO attachProgram(UUID offerId, UUID programId) {
        JobOffer offer = jobOfferRepository.findById(offerId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));
        if (offerProgramService.attach(offerId, programId)) {
            offerAlertService.enqueue(offer, java.util.List.of(programId));
        }
        return mapToDTO(offer);
    }

    public JobOfferDTO detachProgram(UUID offerId, UUID programId) {
        JobOffer offer = jobOfferRepository.findById(offerId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));
        offerProgramService.detach(offerId, programId);
        return mapToDTO(offer);
    }

    public Page<JobOfferDTO> searchByCompany(String company, Pageable pageable) {
        return getActiveOffers(company, null, pageable);
    }

    public Page<JobOfferDTO> searchByTitle(String title, Pageable pageable) {
        return getActiveOffers(title, null, pageable);
    }

    public Page<JobOfferDTO> getByContractType(UUID contractTypeId, Pageable pageable) {
        return getActiveOffers(null, contractTypeId, pageable);
    }

    public JobOfferDTO update(UUID id, CreateJobOfferRequest request) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));

        ContractType contractType = contractTypeRepository.findById(request.getContractTypeId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CONTRACT_TYPE_NOT_FOUND));
        Sector sector = resolveSector(request.getSectorId());
        // Brouillon modifie et garde en brouillon : moyen de postuler pas encore exige. Publication (draft=false) d'un
        // brouillon, ou offre deja publiee : exige, comme avant.
        boolean publishing = jobOffer.isDraft() && Boolean.FALSE.equals(request.getDraft());
        boolean staysDraft = jobOffer.isDraft() && !publishing;
        String emailCandidature = staysDraft ? ApplicationEmailExtractor.extract(request.getDescription()) : requireApplyChannel(request);
        if (publishing) {
            jobOffer.setDraft(false);
            jobOffer.setStaffPublishedAt(Instant.now());
        }
        if (request.getTargetPromotionIds() != null) {
            jobOffer.setTargetPromotions(resolvePromotions(request.getTargetPromotionIds()));
        }

        jobOffer.setTitle(request.getTitle());
        jobOffer.setCompany(request.getCompany());
        jobOffer.setDescription(request.getDescription());
        jobOffer.setLocation(request.getLocation());
        jobOffer.setContractType(contractType);
        jobOffer.setSector(sector);
        jobOffer.setExternalLink(request.getExternalLink());
        jobOffer.setEmailCandidature(emailCandidature);

        JobOffer updated = jobOfferRepository.save(jobOffer);
        auditLogService.log(AuditAction.JOB_OFFER_UPDATED, getCurrentUser(), "JOB_OFFER", updated.getId(),
                updated.getTitle() + " — " + updated.getCompany());
        // Formations : une offre modifiée ne redéclenche pas d'alerte, sauf pour une formation AJOUTÉE (ses étudiants
        // seulement). À la publication d'un brouillon, toutes ses formations.
        if (request.getProgramIds() != null || Boolean.TRUE.equals(request.getAllPrograms())) {
            java.util.Set<UUID> added = offerProgramService.setManualPrograms(updated.getId(), requestedPrograms(request));
            offerAlertService.enqueue(updated, publishing ? linkedPrograms(updated.getId()) : added);
        } else if (publishing) {
            offerAlertService.enqueue(updated, linkedPrograms(updated.getId()));
        }
        return mapToDTO(updated);
    }

    public void deactivate(UUID id) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));
        jobOffer.setActive(false);
        jobOfferRepository.save(jobOffer);
        auditLogService.log(AuditAction.JOB_OFFER_DEACTIVATED, getCurrentUser(), "JOB_OFFER", jobOffer.getId(),
                jobOffer.getTitle() + " — " + jobOffer.getCompany());
    }

    public void activate(UUID id) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));
        jobOffer.setActive(true);
        jobOfferRepository.save(jobOffer);
        auditLogService.log(AuditAction.JOB_OFFER_ACTIVATED, getCurrentUser(), "JOB_OFFER", jobOffer.getId(),
                jobOffer.getTitle() + " — " + jobOffer.getCompany());
    }

    public Page<JobOfferDTO> getAllOffers(String search, Pageable pageable) {
        return getAllOffers(search, null, pageable);
    }

    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, Pageable pageable) {
        return getAllOffers(search, contractTypeId, null, pageable);
    }

    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, UUID sectorId, Pageable pageable) {
        return getAllOffers(search, contractTypeId, sectorId, null, pageable);
    }

    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, UUID sectorId, Boolean active, Pageable pageable) {
        return getAllOffers(search, contractTypeId, sectorId, null, active, pageable);
    }

    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, UUID sectorId, String source, Boolean active, Pageable pageable) {
        return getAllOffers(search, contractTypeId, sectorId, source, active, null, pageable);
    }

    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, UUID sectorId, String source, Boolean active, String location, Pageable pageable) {
        return getAllOffers(search, contractTypeId, sectorId, source, active, location, null, null, pageable);
    }

    /**
     * Liste staff. Filtres en plus de ceux des étudiants :
     * <ul>
     *   <li>« Déposée par » : identifiant du conseiller/admin auteur de l'offre, ou
     *       {@link JobOfferSpecification#POSTED_BY_EXTERNAL} pour les offres externes ;</li>
     *   <li>« Sans moyen de postuler » ({@code noApplyChannel=true}) : offres sans lien ni adresse e-mail de candidature.</li>
     * </ul>
     */
    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, UUID sectorId, String source, Boolean active,
                                          String location, String postedBy, Boolean noApplyChannel, Pageable pageable) {
        return getAllOffers(search, contractTypeId, sectorId, source, active, location, postedBy, noApplyChannel, null, pageable);
    }

    /** Idem, avec le filtre « Brouillons » (draft=true : brouillons seulement ; false : publiees seulement). */
    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, UUID sectorId, String source, Boolean active,
                                          String location, String postedBy, Boolean noApplyChannel, Boolean draft, Pageable pageable) {
        return getAllOffers(search, contractTypeId, sectorId, source, active, location, postedBy, noApplyChannel, draft, null, pageable);
    }

    /** Idem, avec le filtre multi-formations (lot 8). */
    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, UUID sectorId, String source, Boolean active,
                                          String location, String postedBy, Boolean noApplyChannel, Boolean draft,
                                          java.util.Collection<UUID> programIds, Pageable pageable) {
        Specification<JobOffer> spec = JobOfferSpecification.withAllFilters(search, contractTypeId, sectorId, source, active,
                location, normalizePostedBy(postedBy));
        if (programIds != null && !programIds.isEmpty()) {
            spec = spec.and(JobOfferSpecification.withPrograms(programIds));
        }
        if (draft != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("draft"), draft));
        }
        if (Boolean.TRUE.equals(noApplyChannel)) {
            spec = spec.and(JobOfferSpecification.withoutApplyChannel());
        }
        Page<JobOffer> page = jobOfferRepository.findAll(spec, StablePageable.withTieBreakers(pageable, OFFER_TIE_BREAKERS));
        return mapPage(page);
    }

    /** Auteurs possibles du filtre « Déposée par » : conseillers/admins ayant déposé au moins une offre. */
    public List<OfferAuthorDTO> getOfferAuthors() {
        return jobOfferRepository.findOfferAuthors();
    }

    private static String normalizePostedBy(String postedBy) {
        if (postedBy == null || postedBy.isBlank()) {
            return null;
        }
        String value = postedBy.trim();
        if (JobOfferSpecification.POSTED_BY_EXTERNAL.equalsIgnoreCase(value)) {
            return JobOfferSpecification.POSTED_BY_EXTERNAL;
        }
        try {
            return UUID.fromString(value).toString();
        } catch (IllegalArgumentException e) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.JOB_OFFER_INVALID_POSTED_BY);
        }
    }

    @Transactional
    public void delete(UUID id) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));

        // source_job_offer_id est ON DELETE SET NULL : les candidatures CRM liées sont juste
        // détachées, pas supprimées (leurs champs utiles sont déjà copiés). Les clics "postuler"
        // du jobboard (job_applications) n'ont pas de valeur de suivi, on les supprime avec l'offre.
        jobApplicationRepository.deleteByJobOfferId(id);
        jobOfferRepository.delete(jobOffer);
        auditLogService.log(AuditAction.JOB_OFFER_DELETED, getCurrentUser(), "JOB_OFFER", id,
                jobOffer.getTitle() + " — " + jobOffer.getCompany());
    }

    /**
     * Purge en masse (admin) : MANUAL, EXTERNAL (toutes sources externes confondues) ou ALL.
     * Comme pour delete(), les candidatures CRM liées (Application) ne sont pas supprimées —
     * source_job_offer_id est ON DELETE SET NULL et leurs champs utiles sont déjà copiés ; seuls
     * les clics "postuler" du jobboard (JobApplication) sont purgés avec les offres.
     */
    @Transactional
    public void wipe(String scope) {
        int deletedOffers;
        int deletedApplications;
        switch (scope) {
            case "MANUAL" -> {
                deletedApplications = jobApplicationRepository.deleteByJobOfferSource("MANUAL");
                deletedOffers = jobOfferRepository.deleteBySource("MANUAL");
            }
            case "EXTERNAL" -> {
                deletedApplications = jobApplicationRepository.deleteByJobOfferSourceNot("MANUAL");
                deletedOffers = jobOfferRepository.deleteBySourceNot("MANUAL");
            }
            case "ALL" -> {
                deletedApplications = jobApplicationRepository.deleteAllApplications();
                deletedOffers = jobOfferRepository.deleteAllOffers();
            }
            default -> throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.JOB_OFFER_WIPE_INVALID_SCOPE);
        }

        // Une seule ligne pour toute la purge (pas une par offre supprimee) : le detail (scope,
        // compteurs) suffit a comprendre ce qui a ete fait sans noyer le journal d'audit.
        auditLogService.log(AuditAction.JOB_OFFER_WIPED, getCurrentUser(), "JOB_OFFER", (UUID) null,
                "Purge (" + scope + ") — " + deletedOffers + " offre(s), " + deletedApplications + " candidature(s) jobboard");
    }

    /** Page d'offres : les formations de toute la page sont chargées en une requête. */
    private Page<JobOfferDTO> mapPage(Page<JobOffer> page) {
        java.util.Map<UUID, java.util.List<com.itic.paris.platform.alerts.service.OfferProgramService.ProgramRef>> programs =
                offerProgramService.programsOf(page.getContent().stream().map(JobOffer::getId).toList());
        return page.map(o -> mapToDTO(o, programs.getOrDefault(o.getId(), java.util.List.of())));
    }

    private JobOfferDTO mapToDTO(JobOffer jobOffer) {
        return mapToDTO(jobOffer, offerProgramService.programsOf(java.util.List.of(jobOffer.getId()))
                .getOrDefault(jobOffer.getId(), java.util.List.of()));
    }

    private JobOfferDTO mapToDTO(JobOffer jobOffer, java.util.List<com.itic.paris.platform.alerts.service.OfferProgramService.ProgramRef> programs) {
        int applicationCount = (int) jobApplicationRepository.countByJobOfferId(jobOffer.getId());

        return new JobOfferDTO(
                jobOffer.getId(),
                jobOffer.getTitle(),
                jobOffer.getCompany(),
                jobOffer.getDescription(),
                jobOffer.getLocation(),
                mapContractTypeToDTO(jobOffer.getContractType()),
                mapSectorToDTO(jobOffer.getSector()),
                jobOffer.getExternalLink(),
                jobOffer.getSource(),
                jobOffer.getCompanyLogoUrl(),
                jobOffer.getExpiresAt(),
                jobOffer.getPublishedAt(),
                jobOffer.getActive(),
                jobOffer.getCreatedAt(),
                jobOffer.getUpdatedAt(),
                applicationCount,
                jobOffer.getCreatedBy() != null ? jobOffer.getCreatedBy().getFirstName() : null,
                jobOffer.getCreatedBy() != null ? jobOffer.getCreatedBy().getLastName() : null,
                jobOffer.getEmailCandidature(),
                jobOffer.isDraft(),
                jobOffer.getStaffPublishedAt(),
                // Promotions ciblees : jamais renvoyees a un etudiant.
                isStaff() ? jobOffer.getTargetPromotions().stream()
                        .map(p -> new JobOfferDTO.TargetPromotion(p.getId(), p.getName()))
                        .sorted(java.util.Comparator.comparing(JobOfferDTO.TargetPromotion::name))
                        .toList() : null,
                programs
        );
    }

    private ContractTypeDTO mapContractTypeToDTO(ContractType contractType) {
        return new ContractTypeDTO(
                contractType.getId(),
                contractType.getLabel(),
                contractType.getDescription(),
                contractType.getActive(),
                contractType.getCreatedAt()
        );
    }

    private SectorDTO mapSectorToDTO(Sector sector) {
        if (sector == null) {
            return null;
        }
        return new SectorDTO(
                sector.getId(),
                sector.getLabel(),
                sector.getDescription(),
                sector.getActive(),
                sector.getCreatedAt()
        );
    }

    private User getCurrentUser() {
        return userRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
    }
}
