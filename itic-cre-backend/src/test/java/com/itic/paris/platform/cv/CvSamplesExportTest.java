package com.itic.paris.platform.cv;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.cv.model.CvBuilderOptions;
import com.itic.paris.platform.cv.model.CvTemplate;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftRequest;
import com.itic.paris.platform.cv.service.CvDraftValidator;
import com.itic.paris.platform.cv.repository.CvPhotoRepository;
import com.itic.paris.platform.cv.service.CvPhotoService;
import com.itic.paris.platform.cv.service.CvRenderService;
import com.itic.paris.platform.cv.service.CvRenderService.CvRenderOptions;
import com.itic.paris.platform.cv.service.CvRenderService.RenderedPdf;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Regenere les exemples PDF de docs/cv-samples/ avec le vrai moteur de rendu et des CV fictifs : chaque modele,
 * sans photo et avec une photo de remplacement neutre (silhouette dessinee, aucune vraie personne).
 * Ignore par defaut ; depuis itic-cre-backend/ :
 * {@code ./mvnw test -Dtest=CvSamplesExportTest -Dcv.samples.dir=../docs/cv-samples}
 */
@EnabledIfSystemProperty(named = "cv.samples.dir", matches = ".+")
class CvSamplesExportTest {

    private final ICloudStorage storage = mock(ICloudStorage.class);
    private final CvRenderService renderService = new CvRenderService(new CvPhotoService(storage, mock(CvPhotoRepository.class)));
    private final CvDraftValidator validator = new CvDraftValidator();
    /** Exemples dont le nombre de pages n'est pas celui attendu (verifie a la fin, apres avoir tout genere). */
    private final List<String> wrongPageCounts = new ArrayList<>();

    @Test
    void exportSamples() throws IOException {
        Path dir = Path.of(System.getProperty("cv.samples.dir"));
        Files.createDirectories(dir);
        byte[] photo = placeholderPhoto();
        when(storage.downloadFile(anyString())).thenAnswer(inv -> new ByteArrayInputStream(photo));
        for (CvTemplate template : CvTemplate.values()) {
            String name = template.name().toLowerCase();
            export(dir.resolve(name + "-1-page.pdf"), template, CvSampleFixtures.fullCv(), false, 1);
            export(dir.resolve(name + "-1-page-photo.pdf"), template, CvSampleFixtures.fullCv(), true, 1);
            export(dir.resolve(name + "-2-pages.pdf"), template, CvSampleFixtures.longCv(), false, 2);
        }
        assertThat(wrongPageCounts).as("exemples au nombre de pages inattendu").isEmpty();
    }

    private void export(Path file, CvTemplate template, CvDraftData data, boolean withPhoto, int expectedPages)
            throws IOException {
        data.getIdentite().setAfficherPhoto(withPhoto);
        // Un exemple doit rester un brouillon qu'un etudiant pourrait vraiment enregistrer.
        CvDraftRequest request = new CvDraftRequest();
        request.setData(data);
        request.setTemplateCode(template.name());
        request.setAccentColor(CvBuilderOptions.DEFAULT_ACCENT_COLOR);
        request.setCvLang("fr");
        validator.validate(request);

        Student student = new Student();
        student.setId(UUID.randomUUID());
        if (withPhoto) {
            student.setProfilePicture("profiles/exemple.png");
        }
        RenderedPdf pdf = renderService.renderPdf(student, data,
                new CvRenderOptions(template, CvBuilderOptions.DEFAULT_ACCENT_COLOR, "fr"));
        Files.write(file, pdf.bytes());
        if (pdf.pageCount() != expectedPages) {
            wrongPageCounts.add(file.getFileName() + " : " + pdf.pageCount() + " pages au lieu de " + expectedPages);
        }
    }

    /** Photo de remplacement : silhouette grise sur fond bleu tres clair (portrait 300 x 360). */
    private static byte[] placeholderPhoto() throws IOException {
        BufferedImage image = new BufferedImage(300, 360, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(new Color(0xE6ECF7));
        g.fillRect(0, 0, 300, 360);
        g.setColor(new Color(0x9AA8BF));
        g.fillOval(95, 70, 110, 120);
        g.fillOval(40, 215, 220, 230);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}
