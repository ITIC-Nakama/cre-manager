package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.cv.CvPhotoTestImages;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Traitement des photos de CV : vrai type, EXIF supprime, recadrage 5:6, taille adaptee au PDF. */
class CvPhotoImagesTest {

    @Test
    @DisplayName("JPEG de téléphone avec EXIF et GPS : ré-encodé sans aucun bloc EXIF ni coordonnée")
    void exifAndGpsAreRemoved() throws IOException {
        byte[] input = CvPhotoTestImages.withExif(CvPhotoTestImages.jpeg(500, 600, Color.BLUE));
        assertThat(CvPhotoTestImages.jpegSegments(input)).as("le fichier de test a bien un EXIF").contains(0xE1);
        assertThat(CvPhotoTestImages.contains(input, CvPhotoTestImages.GPS_MARKER)).isTrue();

        byte[] output = CvPhotoImages.process(input);

        assertThat(CvPhotoTestImages.jpegSegments(output)).as("aucun APP1 (EXIF) ni autre APP que JFIF")
                .doesNotContain(0xE1).allMatch(m -> m < 0xE1 || m > 0xEF);
        assertThat(CvPhotoTestImages.contains(output, "Exif")).isFalse();
        assertThat(CvPhotoTestImages.contains(output, CvPhotoTestImages.GPS_MARKER)).isFalse();
        assertThat(CvPhotoTestImages.contains(output, "GPS")).isFalse();
        assertThat(CvPhotoImages.sniff(output)).contains(CvPhotoImages.Kind.JPEG);
    }

    @Test
    @DisplayName("Photo paysage : recadrée au centre au format 5:6 puis réduite à 480 x 576")
    void landscapeIsCroppedToTemplateRatioAndResized() throws IOException {
        BufferedImage out = read(CvPhotoImages.process(CvPhotoTestImages.jpeg(1600, 900, Color.GREEN)));
        assertThat(out.getWidth()).isEqualTo(CvPhotoImages.MAX_WIDTH);
        assertThat(out.getHeight()).isEqualTo(CvPhotoImages.MAX_HEIGHT);
        assertThat(out.getWidth() * CvPhotoImages.RATIO_HEIGHT).isEqualTo(out.getHeight() * CvPhotoImages.RATIO_WIDTH);
    }

    @Test
    @DisplayName("Petite photo : jamais agrandie")
    void smallPhotoIsNotUpscaled() throws IOException {
        BufferedImage out = read(CvPhotoImages.process(CvPhotoTestImages.png(100, 120, Color.ORANGE)));
        assertThat(out.getWidth()).isEqualTo(100);
        assertThat(out.getHeight()).isEqualTo(120);
    }

    @Test
    @DisplayName("PNG transparent : fond blanc dans le JPEG")
    void transparencyBecomesWhite() throws IOException {
        BufferedImage out = read(CvPhotoImages.process(CvPhotoTestImages.transparentPng(250, 300)));
        Color corner = new Color(out.getRGB(2, 2));
        assertThat(corner.getRed()).isGreaterThan(240);
        assertThat(corner.getGreen()).isGreaterThan(240);
        assertThat(corner.getBlue()).isGreaterThan(240);
    }

    @Test
    @DisplayName("Vrai type vérifié : PDF, GIF ou WebP renommés en .jpg sont refusés")
    void onlyRealJpegOrPngIsAccepted() throws IOException {
        byte[] pdf = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n".getBytes(StandardCharsets.US_ASCII);
        byte[] gif = "GIF89a\u0001\u0000\u0001\u0000".getBytes(StandardCharsets.ISO_8859_1);
        byte[] webp = "RIFF\u0000\u0000\u0000\u0000WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1);
        for (byte[] input : new byte[][]{pdf, gif, webp, new byte[0]}) {
            assertThatThrownBy(() -> CvPhotoImages.process(input))
                    .isInstanceOf(AppException.class).hasMessage("cv-photo-invalid-type");
        }
    }

    @Test
    @DisplayName("Signature JPEG mais contenu corrompu : refusé comme illisible")
    void corruptedJpegIsRejected() {
        byte[] fake = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 4, 'x', 'x', 'x', 'x'};
        assertThatThrownBy(() -> CvPhotoImages.process(fake))
                .isInstanceOf(AppException.class).hasMessage("cv-photo-unreadable");
    }

    @Test
    @DisplayName("Image « bombe » (en-tête annonçant 20 000 x 20 000 px) : refusée avant tout décodage")
    void decompressionBombIsRejectedBeforeDecoding() {
        assertThatThrownBy(() -> CvPhotoImages.process(CvPhotoTestImages.pngHeaderOnly(20_000, 20_000)))
                .isInstanceOf(AppException.class).hasMessage("cv-photo-unreadable");
    }

    private static BufferedImage read(byte[] jpeg) throws IOException {
        assertThat(CvPhotoImages.sniff(jpeg)).contains(CvPhotoImages.Kind.JPEG);
        return ImageIO.read(new ByteArrayInputStream(jpeg));
    }
}
