package com.itic.paris.platform.cv;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.cv.model.CvBuilderOptions;
import com.itic.paris.platform.cv.model.CvTemplate;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftRequest;
import com.itic.paris.platform.cv.service.CvDraftValidator;
import com.itic.paris.platform.cv.service.CvRenderService;
import com.itic.paris.platform.cv.service.CvRenderService.CvRenderOptions;
import com.itic.paris.platform.cv.service.CvRenderService.RenderedPdf;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * Regenere les exemples PDF de docs/cv-samples/ avec le vrai moteur de rendu et des CV fictifs.
 * Ignore par defaut ; depuis itic-cre-backend/ :
 * {@code ./mvnw test -Dtest=CvSamplesExportTest -Dcv.samples.dir=../docs/cv-samples}
 */
@EnabledIfSystemProperty(named = "cv.samples.dir", matches = ".+")
class CvSamplesExportTest {

    private final CvRenderService renderService = new CvRenderService(mock(ICloudStorage.class));
    private final CvDraftValidator validator = new CvDraftValidator();

    @Test
    void exportSamples() throws IOException {
        Path dir = Path.of(System.getProperty("cv.samples.dir"));
        Files.createDirectories(dir);
        for (CvTemplate template : CvTemplate.values()) {
            String name = template.name().toLowerCase();
            export(dir.resolve(name + "-1-page.pdf"), template, CvSampleFixtures.fullCv(), 1);
            export(dir.resolve(name + "-2-pages.pdf"), template, CvSampleFixtures.longCv(), 2);
        }
    }

    private void export(Path file, CvTemplate template, CvDraftData data, int expectedPages) throws IOException {
        // Un exemple doit rester un brouillon qu'un etudiant pourrait vraiment enregistrer.
        CvDraftRequest request = new CvDraftRequest();
        request.setData(data);
        request.setTemplateCode(template.name());
        request.setAccentColor(CvBuilderOptions.DEFAULT_ACCENT_COLOR);
        request.setCvLang("fr");
        validator.validate(request);

        RenderedPdf pdf = renderService.renderPdf(new Student(), data,
                new CvRenderOptions(template, CvBuilderOptions.DEFAULT_ACCENT_COLOR, "fr"));
        assertThat(pdf.pageCount()).as(file.getFileName().toString()).isEqualTo(expectedPages);
        Files.write(file, pdf.bytes());
    }
}
