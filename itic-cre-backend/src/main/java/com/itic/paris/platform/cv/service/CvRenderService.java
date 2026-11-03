package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.cv.model.CvTemplate;
import com.itic.paris.platform.cv.model.converter.CvDraftDataConverter;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.storage.ICloudStorage;
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
import java.util.Set;

/**
 * Rendu des modeles de CV (templates/cv/*.html) : HTML pour l'apercu, PDF pour le telechargement et l'envoi.
 * Le meme HTML sert aux deux, ce que l'etudiant voit est ce qu'il obtient.
 */
@Slf4j
@Service
public class CvRenderService {

    /** Colonne laterale du modele Moderne ; le reste va dans la colonne principale. */
    private static final Set<String> SIDEBAR_SECTIONS = Set.of("competences", "langues", "centresInteret");

    /** Polices embarquees (l'image Docker alpine n'en a aucune) : famille CSS, fichier, graisse, style. */
    private record FontFile(String family, String file, int weight, BaseRendererBuilder.FontStyle style) {}

    private static final List<FontFile> FONT_FILES = List.of(
            new FontFile("Roboto", "Roboto-Regular.ttf", 400, BaseRendererBuilder.FontStyle.NORMAL),
            new FontFile("Roboto", "Roboto-Medium.ttf", 500, BaseRendererBuilder.FontStyle.NORMAL),
            new FontFile("Roboto", "Roboto-Bold.ttf", 700, BaseRendererBuilder.FontStyle.NORMAL),
            new FontFile("Roboto", "Roboto-Italic.ttf", 400, BaseRendererBuilder.FontStyle.ITALIC),
            new FontFile("PT Serif", "PTSerif-Regular.ttf", 400, BaseRendererBuilder.FontStyle.NORMAL),
            new FontFile("PT Serif", "PTSerif-Bold.ttf", 700, BaseRendererBuilder.FontStyle.NORMAL),
            new FontFile("PT Serif", "PTSerif-Italic.ttf", 400, BaseRendererBuilder.FontStyle.ITALIC));

    public record CvRenderOptions(CvTemplate template, String accentColor, String lang) {}

    public record RenderedPdf(byte[] bytes, int pageCount) {}

    private final ICloudStorage cloudStorage;
    private final SpringTemplateEngine templateEngine;
    private final List<byte[]> fontBytes;

    public CvRenderService(ICloudStorage cloudStorage) {
        this.cloudStorage = cloudStorage;
        this.templateEngine = buildTemplateEngine();
        this.fontBytes = FONT_FILES.stream().map(f -> readClasspath("fonts/" + f.file())).toList();
    }

    public String renderHtml(Student student, CvDraftData data, CvRenderOptions options) {
        CvDraftData cv = clean(data);
        Locale locale = "en".equals(options.lang()) ? Locale.ENGLISH : Locale.FRENCH;

        Context context = new Context(locale);
        context.setVariable("cv", cv);
        context.setVariable("fmt", new CvTemplateHelper(locale));
        List<String> sections = visibleSections(cv);
        context.setVariable("sections", sections);
        context.setVariable("mainSections", sections.stream().filter(s -> !SIDEBAR_SECTIONS.contains(s)).toList());
        context.setVariable("sideSections", sections.stream().filter(SIDEBAR_SECTIONS::contains).toList());
        context.setVariable("accent", options.accentColor());
        context.setVariable("accentLight", tint(options.accentColor(), 0.90));
        context.setVariable("fullName", fullName(cv));
        context.setVariable("photo", Boolean.TRUE.equals(cv.getIdentite().getAfficherPhoto()) ? photoDataUri(student) : null);
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
        List<String> visible = new ArrayList<>();
        for (String section : cv.getOrdreSections()) {
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

    /** Photo de profil existante en data: URI (JPEG/PNG uniquement : PDFBox ne lit pas le WebP). */
    private String photoDataUri(Student student) {
        if (student.getProfilePicture() == null) {
            return null;
        }
        try (InputStream in = cloudStorage.downloadFile(student.getProfilePicture())) {
            if (in == null) {
                return null;
            }
            byte[] bytes = in.readAllBytes();
            String mime = imageMime(bytes);
            return mime == null ? null : "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(bytes);
        } catch (IOException | RuntimeException e) {
            log.warn("Photo de profil illisible pour le CV de l'etudiant {}", student.getId());
            return null;
        }
    }

    private static String imageMime(byte[] bytes) {
        if (bytes.length > 3 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8) {
            return "image/jpeg";
        }
        if (bytes.length > 8 && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') {
            return "image/png";
        }
        return null;
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
