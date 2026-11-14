package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.cv.model.CvTemplate;
import com.itic.paris.platform.cv.model.converter.CvDraftDataConverter;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import com.itic.paris.platform.shared.local.MessageKey;
import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder;
import com.openhtmltopdf.outputdevice.helper.ExternalResourceControlPriority;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

/**
 * Rendu des modeles de CV (templates/cv/*.html) : HTML pour l'apercu, PDF pour le telechargement et l'envoi.
 * Le meme HTML sert aux deux, ce que l'etudiant voit est ce qu'il obtient.
 */
@Slf4j
@Service
public class CvRenderService {

    /** Polices embarquees (l'image Docker alpine n'en a aucune) : famille CSS, fichier, graisse, style. */
    private record FontFile(String family, String file, int weight, BaseRendererBuilder.FontStyle style) {}

    private static final List<FontFile> FONT_FILES = List.of(
            new FontFile("Roboto", "Roboto-Regular.ttf", 400, BaseRendererBuilder.FontStyle.NORMAL),
            new FontFile("Roboto", "Roboto-Medium.ttf", 500, BaseRendererBuilder.FontStyle.NORMAL),
            new FontFile("Roboto", "Roboto-Bold.ttf", 700, BaseRendererBuilder.FontStyle.NORMAL),
            new FontFile("Roboto", "Roboto-Italic.ttf", 400, BaseRendererBuilder.FontStyle.ITALIC));

    /** Couleurs fixes de la plateforme CRE (plus de choix de couleur par l'etudiant). */
    static final String NAVY = "#11305B";
    static final String BLUE = "#3B71FF";
    static final String ORANGE = "#E2762F";

    /** Logos ITIC (PNG transparents tires des SVG de la plateforme), integres en data: URI. */
    private static final String LOGO_NAVY = "templates/cv/assets/itic-logo-marine.png";
    private static final String LOGO_WHITE = "templates/cv/assets/itic-logo-blanc.png";
    private static final String LOGO_MARK = "templates/cv/assets/itic-symbole.png";

    public record CvRenderOptions(CvTemplate template, String accentColor, String lang) {}

    public record RenderedPdf(byte[] bytes, int pageCount) {}

    private final CvPhotoService photoService;
    private final SpringTemplateEngine templateEngine;
    private final List<byte[]> fontBytes;
    private final String logoNavy;
    private final String logoWhite;
    private final String logoMark;

    public CvRenderService(CvPhotoService photoService) {
        this.photoService = photoService;
        this.templateEngine = buildTemplateEngine();
        this.fontBytes = FONT_FILES.stream().map(f -> readClasspath("fonts/" + f.file())).toList();
        this.logoNavy = pngDataUri(LOGO_NAVY);
        this.logoWhite = pngDataUri(LOGO_WHITE);
        this.logoMark = pngDataUri(LOGO_MARK);
    }

    /** HTML du PDF (telechargement, envoi) : emplacement photo vide et muet sans photo. */
    public String renderHtml(Student student, CvDraftData data, CvRenderOptions options) {
        return render(student, data, options, false);
    }

    /**
     * HTML de l'apercu de l'editeur : identique au PDF, sauf l'emplacement photo vide qui affiche « Ajouter une
     * photo » (data-cv-photo : la page de l'editeur place un bouton par-dessus). Jamais utilise pour le PDF.
     */
    public String renderPreviewHtml(Student student, CvDraftData data, CvRenderOptions options) {
        return render(student, data, options, true);
    }

    private String render(Student student, CvDraftData data, CvRenderOptions options, boolean editor) {
        CvDraftData cv = clean(data);
        Locale locale = "en".equals(options.lang()) ? Locale.ENGLISH : Locale.FRENCH;

        Context context = new Context(locale);
        context.setVariable("cv", cv);
        context.setVariable("fmt", new CvTemplateHelper(locale));
        context.setVariable("sections", visibleSections(cv, options.template()));
        context.setVariable("navy", NAVY);
        context.setVariable("blue", BLUE);
        context.setVariable("orange", ORANGE);
        context.setVariable("blueLight", tint(BLUE, 0.78));
        context.setVariable("navyLight", tint(NAVY, 0.88));
        context.setVariable("logoNavy", logoNavy);
        context.setVariable("logoWhite", logoWhite);
        context.setVariable("logoMark", logoMark);
        context.setVariable("fullName", fullName(cv));
        // L'emplacement photo est toujours reserve (la mise en page ne bouge pas) ; photo = null le laisse vide.
        context.setVariable("photo", Boolean.TRUE.equals(cv.getIdentite().getAfficherPhoto())
                ? photoDataUri(student, options.template()) : null);
        context.setVariable("editor", editor);
        context.setVariable("lang", locale.getLanguage());

        return templateEngine.process(options.template().templateName(), context);
    }

    public RenderedPdf renderPdf(Student student, CvDraftData data, CvRenderOptions options) {
        String html = renderHtml(student, data, options);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            for (int i = 0; i < FONT_FILES.size(); i++) {
                FontFile font = FONT_FILES.get(i);
                byte[] bytes = fontBytes.get(i);
                builder.useFont(() -> new ByteArrayInputStream(bytes), font.family(), font.weight(), font.style(), true);
            }
            // Aucune ressource externe : la photo est en data: URI, les polices sont fournies ci-dessus.
            // Bloque tout chargement d'URL (SSRF) si un lien saisi finissait dans un attribut src.
            builder.useExternalResourceAccessControl((uri, type) -> uri != null && uri.startsWith("data:"),
                    ExternalResourceControlPriority.RUN_BEFORE_RESOLVING_URI);
            builder.withHtmlContent(html, null);
            builder.toStream(out);
            builder.run();

            byte[] bytes = out.toByteArray();
            return new RenderedPdf(bytes, countPages(bytes));
        } catch (IOException | RuntimeException e) {
            log.error("Echec de generation du PDF de CV pour l'etudiant {}", student.getId(), e);
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.CV_BUILDER_PDF_FAILED, e);
        }
    }

    // ─── Preparation des donnees ────────────────────────────────────────────

    /** Copie du brouillon sans les entrees, points et etiquettes vides : une section vide n'apparait pas. */
    CvDraftData clean(CvDraftData source) {
        CvDraftData cv = new CvDraftDataConverter().convertToEntityAttribute(CvDraftDataConverter.toJson(source));
        cv.getIdentite().getLiens().removeIf(l -> isBlank(l.getUrl()));
        cv.getExperiences().removeIf(e -> isBlank(e.getPoste()) && isBlank(e.getEntreprise()));
        cv.getExperiences().forEach(e -> e.getPoints().removeIf(CvRenderService::isBlank));
        cv.getFormations().removeIf(f -> isBlank(f.getDiplome()) && isBlank(f.getEtablissement()));
        cv.getFormations().forEach(f -> f.getPoints().removeIf(CvRenderService::isBlank));
        cv.getProjets().removeIf(p -> isBlank(p.getNom()) && isBlank(p.getDescription()));
        cv.getProjets().forEach(p -> p.getTechnos().removeIf(CvRenderService::isBlank));
        cv.getCompetences().getTechniques().removeIf(CvRenderService::isBlank);
        cv.getCompetences().getOutils().removeIf(CvRenderService::isBlank);
        cv.getCompetences().getSavoirEtre().removeIf(CvRenderService::isBlank);
        cv.getLangues().removeIf(l -> isBlank(l.getLangue()));
        cv.getCertifications().removeIf(c -> isBlank(c.getNom()));
        cv.getCentresInteret().removeIf(CvRenderService::isBlank);
        return cv;
    }

    /** Sections dans l'ordre choisi, sans les sections masquees ni vides. */
    List<String> visibleSections(CvDraftData cv) {
        return visibleSections(cv, null);
    }

    /**
     * Sections a afficher, dans l'ordre : celui de l'etudiant s'il a reordonne (ordrePersonnalise), sinon celui
     * du modele (CvTemplate.defaultSections). Sections masquees ou vides retirees.
     */
    List<String> visibleSections(CvDraftData cv, CvTemplate template) {
        List<String> order = template == null || Boolean.TRUE.equals(cv.getOrdrePersonnalise())
                ? cv.getOrdreSections() : template.defaultSections();
        List<String> visible = new ArrayList<>();
        for (String section : order) {
            if (!cv.getSectionsMasquees().contains(section) && hasContent(cv, section)) {
                visible.add(section);
            }
        }
        return visible;
    }

    private boolean hasContent(CvDraftData cv, String section) {
        return switch (section) {
            case "experiences" -> !cv.getExperiences().isEmpty();
            case "formations" -> !cv.getFormations().isEmpty();
            case "projets" -> !cv.getProjets().isEmpty();
            case "competences" -> !cv.getCompetences().getTechniques().isEmpty()
                    || !cv.getCompetences().getOutils().isEmpty()
                    || !cv.getCompetences().getSavoirEtre().isEmpty();
            case "langues" -> !cv.getLangues().isEmpty();
            case "certifications" -> !cv.getCertifications().isEmpty();
            case "centresInteret" -> !cv.getCentresInteret().isEmpty();
            default -> false;
        };
    }

    static String fullName(CvDraftData cv) {
        String prenom = cv.getIdentite().getPrenom() == null ? "" : cv.getIdentite().getPrenom().trim();
        String nom = cv.getIdentite().getNom() == null ? "" : cv.getIdentite().getNom().trim();
        return (prenom + " " + nom).trim();
    }

    /** Photo du CV (propre au CV, sinon de profil) au format du modele (carre ou portrait), sans metadonnees. */
    private String photoDataUri(Student student, CvTemplate template) {
        byte[] jpeg = photoService.render(student, template.photoFormat());
        return jpeg == null ? null : "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(jpeg);
    }

    private static String pngDataUri(String path) {
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(readClasspath(path));
    }

    /** Melange la couleur d'accent avec du blanc (ratio = part de blanc) pour les fonds clairs. */
    static String tint(String hex, double ratio) {
        int rgb = Integer.parseInt(hex.substring(1), 16);
        int r = (rgb >> 16) & 0xFF;
        int g = (rgb >> 8) & 0xFF;
        int b = rgb & 0xFF;
        r = (int) Math.round(r + (255 - r) * ratio);
        g = (int) Math.round(g + (255 - g) * ratio);
        b = (int) Math.round(b + (255 - b) * ratio);
        return String.format("#%02X%02X%02X", r, g, b);
    }

    private static int countPages(byte[] pdf) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            return document.getNumberOfPages();
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    // ─── Moteur Thymeleaf dedie ─────────────────────────────────────────────

    /**
     * Moteur distinct de celui des e-mails : il porte ses propres messages (templates/cv/messages*.properties)
     * sans ajouter de MessageSource global a l'application.
     */
    private static SpringTemplateEngine buildTemplateEngine() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        resolver.setCacheable(true);

        ResourceBundleMessageSource messages = new ResourceBundleMessageSource();
        messages.setBasename("templates/cv/messages");
        messages.setDefaultEncoding("UTF-8");
        messages.setFallbackToSystemLocale(false);

        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        engine.setTemplateEngineMessageSource(messages);
        return engine;
    }

    private static byte[] readClasspath(String path) {
        try (InputStream in = CvRenderService.class.getClassLoader().getResourceAsStream(path)) {
            if (in == null) {
                throw new IllegalStateException("Ressource introuvable : " + path);
            }
            return in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
