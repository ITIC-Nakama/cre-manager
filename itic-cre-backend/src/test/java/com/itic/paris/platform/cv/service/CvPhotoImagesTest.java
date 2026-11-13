package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.cv.CvPhotoTestImages;
import com.itic.paris.platform.cv.model.CvPhotoFormat;
import com.itic.paris.platform.cv.service.CvPhotoImages.CropZone;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Rectangle;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Traitement des photos de CV : original assaini (vrai type, orientation, EXIF supprime, 2000 px au plus, WebP
 * converti pour la photo de profil) et image de chaque modele derivee de la zone choisie (carre ou portrait 5:6).
 */
class CvPhotoImagesTest {

    // ─── Original assaini ─────────────────────────────────────────────────────

    @Test
    @DisplayName("JPEG de téléphone avec EXIF et GPS : original ré-encodé sans aucun bloc EXIF ni coordonnée, pas recadré")
    void exifAndGpsAreRemovedAndTheOriginalIsKept() throws IOException {
        byte[] input = CvPhotoTestImages.withExif(CvPhotoTestImages.jpeg(800, 600, Color.BLUE));
        assertThat(CvPhotoTestImages.jpegSegments(input)).as("le fichier de test a bien un EXIF").contains(0xE1);
        assertThat(CvPhotoTestImages.contains(input, CvPhotoTestImages.GPS_MARKER)).isTrue();

        byte[] output = CvPhotoImages.normalizeOriginal(input, false);

        assertThat(CvPhotoTestImages.jpegSegments(output)).as("aucun APP1 (EXIF) ni autre APP que JFIF")
                .doesNotContain(0xE1).allMatch(m -> m < 0xE1 || m > 0xEF);
        assertThat(CvPhotoTestImages.contains(output, "Exif")).isFalse();
        assertThat(CvPhotoTestImages.contains(output, "GPS")).isFalse();
        BufferedImage image = read(output);
        assertThat(image.getWidth()).as("l'original n'est pas recadré").isEqualTo(800);
        assertThat(image.getHeight()).isEqualTo(600);
    }

    @Test
    @DisplayName("Orientation EXIF (téléphone tenu en portrait) appliquée aux pixels avant de supprimer l'EXIF")
    void exifOrientationIsAppliedToPixels() throws IOException {
        // Stockée couchée 400 x 200, coin haut gauche vert ; orientation 6 = tourner de 90° vers la droite.
        BufferedImage stored = new BufferedImage(400, 200, BufferedImage.TYPE_INT_RGB);
        var g = stored.createGraphics();
        g.setColor(Color.BLUE);
        g.fillRect(0, 0, 400, 200);
        g.setColor(Color.GREEN);
        g.fillRect(0, 0, 60, 60);
        g.dispose();
        var bytes = new java.io.ByteArrayOutputStream();
        ImageIO.write(stored, "jpg", bytes);

        BufferedImage upright = read(CvPhotoImages.normalizeOriginal(CvPhotoTestImages.withOrientation(bytes.toByteArray(), 6), false));

        assertThat(upright.getWidth()).isEqualTo(200);
        assertThat(upright.getHeight()).isEqualTo(400);
        assertThat(isGreen(upright.getRGB(upright.getWidth() - 10, 10))).as("le coin vert est passé en haut à droite").isTrue();
        assertThat(CvPhotoImages.exifOrientation(CvPhotoTestImages.jpeg(10, 10, Color.RED))).isEqualTo(1);
    }

    @Test
    @DisplayName("Grande photo : l'original gardé fait 2000 px de côté au plus ; une petite n'est jamais agrandie")
    void originalIsBoundedButNeverUpscaled() throws IOException {
        BufferedImage big = read(CvPhotoImages.normalizeOriginal(CvPhotoTestImages.jpeg(4000, 3000, Color.GREEN), false));
        assertThat(Math.max(big.getWidth(), big.getHeight())).isEqualTo(CvPhotoImages.MAX_ORIGINAL_SIDE);
        assertThat(big.getWidth() * 3).isEqualTo(big.getHeight() * 4);
        BufferedImage small = read(CvPhotoImages.normalizeOriginal(CvPhotoTestImages.png(100, 120, Color.ORANGE), false));
        assertThat(small.getWidth()).isEqualTo(100);
        assertThat(small.getHeight()).isEqualTo(120);
    }

    @Test
    @DisplayName("PNG transparent : fond blanc dans le JPEG")
    void transparencyBecomesWhite() throws IOException {
        BufferedImage out = read(CvPhotoImages.normalizeOriginal(CvPhotoTestImages.transparentPng(250, 300), false));
        Color corner = new Color(out.getRGB(2, 2));
        assertThat(corner.getRed()).isGreaterThan(240);
        assertThat(corner.getGreen()).isGreaterThan(240);
        assertThat(corner.getBlue()).isGreaterThan(240);
    }

    @Test
    @DisplayName("Photo de profil WebP (avec perte, ou sans perte et transparente) : convertie en JPEG ; refusée pour un envoi")
    void webpIsConvertedForProfilePhotosOnly() throws IOException {
        byte[] lossy = CvPhotoTestImages.resource("photo-profil.webp");
        BufferedImage converted = read(CvPhotoImages.normalizeOriginal(lossy, true));
        assertThat(converted.getWidth()).isEqualTo(300);
        assertThat(converted.getHeight()).isEqualTo(360);
        Color mark = new Color(converted.getRGB(10, 10));
        assertThat(mark.getRed()).as("couleurs conservées").isGreaterThan(180);

        BufferedImage transparent = read(CvPhotoImages.normalizeOriginal(CvPhotoTestImages.resource("photo-profil-transparente.webp"), true));
        assertThat(new Color(transparent.getRGB(2, 2)).getRed()).as("transparence sur fond blanc").isGreaterThan(240);

        assertThatThrownBy(() -> CvPhotoImages.normalizeOriginal(lossy, false))
                .isInstanceOf(AppException.class).hasMessage("cv-photo-invalid-type");
    }

    @Test
    @DisplayName("Vrai type vérifié : PDF, GIF, WebP abîmé renommés en .jpg sont refusés")
    void onlyRealImagesAreAccepted() {
        byte[] pdf = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n".getBytes(StandardCharsets.US_ASCII);
        byte[] gif = "GIF89a\u0001\u0000\u0001\u0000".getBytes(StandardCharsets.ISO_8859_1);
        for (byte[] input : new byte[][]{pdf, gif, new byte[0]}) {
            assertThatThrownBy(() -> CvPhotoImages.normalizeOriginal(input, true))
                    .isInstanceOf(AppException.class).hasMessage("cv-photo-invalid-type");
        }
        byte[] brokenWebp = "RIFF\u0000\u0000\u0000\u0000WEBPVP8 abimee".getBytes(StandardCharsets.ISO_8859_1);
        assertThatThrownBy(() -> CvPhotoImages.normalizeOriginal(brokenWebp, true))
                .isInstanceOf(AppException.class).hasMessage("cv-photo-unreadable");
    }

    @Test
    @DisplayName("Signature JPEG mais contenu corrompu, ou image « bombe » (20 000 x 20 000 annoncés) : refusés")
    void corruptedOrHugeImagesAreRejected() {
        byte[] fake = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 4, 'x', 'x', 'x', 'x'};
        assertThatThrownBy(() -> CvPhotoImages.normalizeOriginal(fake, false))
                .isInstanceOf(AppException.class).hasMessage("cv-photo-unreadable");
        assertThatThrownBy(() -> CvPhotoImages.normalizeOriginal(CvPhotoTestImages.pngHeaderOnly(20_000, 20_000), false))
                .isInstanceOf(AppException.class).hasMessage("cv-photo-unreadable");
    }

    // ─── Format de chaque modele ─────────────────────────────────────────────

    @Test
    @DisplayName("Zone carrée choisie (Linéaire) : le portrait 5:6 la contient, centré dessus ; le carré est la zone")
    void derivedCropContainsTheZoneAndIsCentredOnIt() {
        CropZone square = new CropZone(0.5, 100 / 1200.0, 0.4, 400 / 1200.0);   // 400 x 400 px en (500, 100)

        assertThat(CvPhotoImages.derivedCrop(1000, 1200, square, CvPhotoFormat.SQUARE))
                .isEqualTo(new Rectangle(500, 100, 400, 400));
        Rectangle portrait = CvPhotoImages.derivedCrop(1000, 1200, square, CvPhotoFormat.PORTRAIT);
        assertThat(portrait.width * 6).isEqualTo(portrait.height * 5);
        assertThat(portrait.contains(new Rectangle(500, 100, 400, 400))).as("le visage cadré n'est pas coupé").isTrue();
        assertThat(portrait.getCenterX()).isEqualTo(700);
        assertThat(portrait.getCenterY()).isEqualTo(300);
    }

    @Test
    @DisplayName("Sans zone (photo de profil) : le plus grand rectangle centré ; près d'un bord : recalé dans l'image")
    void derivedCropWithoutZoneAndNearAnEdge() {
        assertThat(CvPhotoImages.derivedCrop(1600, 900, CropZone.FULL, CvPhotoFormat.SQUARE))
                .isEqualTo(new Rectangle(350, 0, 900, 900));
        assertThat(CvPhotoImages.derivedCrop(1600, 900, CropZone.FULL, CvPhotoFormat.PORTRAIT))
                .isEqualTo(new Rectangle(425, 0, 750, 900));
        Rectangle nearTop = CvPhotoImages.derivedCrop(1000, 1200, new CropZone(0.4, 0, 0.2, 0.1), CvPhotoFormat.PORTRAIT);
        assertThat(nearTop.y).isZero();
        assertThat(nearTop.width * 6).isEqualTo(nearTop.height * 5);
    }

    @Test
    @DisplayName("Image du PDF : 480 x 480 (carré) ou 480 x 576 (portrait), centrée sur la zone choisie")
    void renderedFormatsAreCentredOnTheChosenZone() throws IOException {
        byte[] original = CvPhotoImages.normalizeOriginal(CvPhotoTestImages.markedPhoto(), false);
        CropZone redSquare = new CropZone(0.5, 100 / 1200.0, 0.4, 400 / 1200.0);

        BufferedImage square = read(CvPhotoImages.renderFormat(original, redSquare, CvPhotoFormat.SQUARE));
        BufferedImage portrait = read(CvPhotoImages.renderFormat(original, redSquare, CvPhotoFormat.PORTRAIT));

        assertThat(square.getWidth()).isEqualTo(400);
        assertThat(square.getHeight()).isEqualTo(400);
        assertThat(portrait.getWidth() * 6).isEqualTo(portrait.getHeight() * 5);
        assertThat(isRed(square.getRGB(square.getWidth() / 2, square.getHeight() / 2))).isTrue();
        assertThat(isRed(portrait.getRGB(portrait.getWidth() / 2, portrait.getHeight() / 2))).isTrue();

        BufferedImage full = read(CvPhotoImages.renderFormat(original, CropZone.FULL, CvPhotoFormat.PORTRAIT));
        assertThat(full.getWidth()).isEqualTo(480);
        assertThat(full.getHeight()).isEqualTo(576);
    }

    @Test
    @DisplayName("Zone envoyée : les quatre valeurs ou aucune, dans l'image, pas minuscule")
    void cropZoneIsValidated() {
        assertThat(CropZone.of(null, null, null, null)).isEqualTo(CropZone.FULL);
        assertThat(CropZone.of(0.1, 0.2, 0.5, 0.6)).isEqualTo(new CropZone(0.1, 0.2, 0.5, 0.6));
        assertThat(CropZone.of(0.5, 0.0, 0.5004, 1.0004).width()).as("arrondi du navigateur toléré").isEqualTo(0.5);
        for (Double[] bad : new Double[][]{{0.1, null, 0.5, 0.5}, {0.9, 0.0, 0.5, 0.5}, {0.0, 0.0, 0.001, 0.5},
                {-0.2, 0.0, 0.5, 0.5}, {Double.NaN, 0.0, 0.5, 0.5}}) {
            assertThatThrownBy(() -> CropZone.of(bad[0], bad[1], bad[2], bad[3]))
                    .isInstanceOf(AppException.class).hasMessage("cv-photo-invalid-crop");
        }
    }

    private static BufferedImage read(byte[] jpeg) throws IOException {
        assertThat(CvPhotoImages.sniff(jpeg)).contains(CvPhotoImages.Kind.JPEG);
        return ImageIO.read(new ByteArrayInputStream(jpeg));
    }

    private static boolean isRed(int rgb) {
        Color c = new Color(rgb);
        return c.getRed() > 200 && c.getGreen() < 60 && c.getBlue() < 60;
    }

    private static boolean isGreen(int rgb) {
        Color c = new Color(rgb);
        return c.getGreen() > 200 && c.getRed() < 60 && c.getBlue() < 60;
    }
}
