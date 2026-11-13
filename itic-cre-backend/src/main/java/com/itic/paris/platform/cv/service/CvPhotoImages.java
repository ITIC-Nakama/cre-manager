package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.shared.local.MessageKey;
import org.springframework.http.HttpStatus;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Optional;

/**
 * Traitement des photos de CV, pour la photo propre au CV comme pour la photo de profil reprise dans le CV :
 * <ol>
 *   <li>vrai type du fichier : signature JPEG ou PNG (ni l'extension ni le Content-Type annonce ne comptent) ;</li>
 *   <li>dimensions lues AVANT le decodage et bornees (pas d'image « bombe ») ;</li>
 *   <li>recadrage centre au format des emplacements photo des modeles (portrait 5:6, le meme pour les 4) ;</li>
 *   <li>reduction a 480 x 576 px au plus : environ 470 ppp pour un emplacement de 26 mm, net a l'impression ;</li>
 *   <li>re-encodage JPEG sur fond blanc, SANS aucune metadonnee : EXIF (position GPS, appareil, date) supprime.</li>
 * </ol>
 * Le client recadre deja au bon format ; le serveur ne lui fait pas confiance et recadre de nouveau si besoin.
 */
public final class CvPhotoImages {

    /** Format des emplacements photo (largeur:hauteur), identique dans les 4 modeles. */
    public static final int RATIO_WIDTH = 5;
    public static final int RATIO_HEIGHT = 6;
    static final int MAX_WIDTH = 480;
    static final int MAX_HEIGHT = MAX_WIDTH * RATIO_HEIGHT / RATIO_WIDTH;
    /** Au-dela, l'image est refusee sans etre decodee. */
    static final int MAX_SIDE = 12_000;
    static final long MAX_PIXELS = 50_000_000L;
    private static final float JPEG_QUALITY = 0.9f;

    public enum Kind { JPEG, PNG }

    private CvPhotoImages() {
    }

    /** Type reel d'apres les premiers octets du fichier. */
    public static Optional<Kind> sniff(byte[] bytes) {
        if (bytes == null) {
            return Optional.empty();
        }
        if (bytes.length > 3 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return Optional.of(Kind.JPEG);
        }
        if (bytes.length > 8 && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G'
                && bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A) {
            return Optional.of(Kind.PNG);
        }
        return Optional.empty();
    }

    /**
     * Photo prete pour le PDF : JPEG 5:6 sans metadonnees.
     * @throws AppException 400 CV_PHOTO_INVALID_TYPE (ni JPEG ni PNG) ou CV_PHOTO_UNREADABLE (illisible, trop grande)
     */
    public static byte[] process(byte[] input) {
        Kind kind = sniff(input).orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_PHOTO_INVALID_TYPE));
        BufferedImage decoded = decode(input, kind);
        BufferedImage cropped = cropToRatio(decoded);
        BufferedImage resized = resize(cropped);
        return encodeJpeg(resized);
    }

    private static BufferedImage decode(byte[] input, Kind kind) {
        Iterator<ImageReader> readers = ImageIO.getImageReadersByFormatName(kind == Kind.JPEG ? "jpeg" : "png");
        if (!readers.hasNext()) {
            throw unreadable();
        }
        ImageReader reader = readers.next();
        try (ImageInputStream stream = ImageIO.createImageInputStream(new ByteArrayInputStream(input))) {
            // ignoreMetadata : les blocs EXIF ne sont meme pas lus.
            reader.setInput(stream, true, true);
            int width = reader.getWidth(0);
            int height = reader.getHeight(0);
            if (width <= 0 || height <= 0 || width > MAX_SIDE || height > MAX_SIDE || (long) width * height > MAX_PIXELS) {
                throw unreadable();
            }
            // Grande photo d'appareil : on ne decode qu'un pixel sur n (memoire bornee), la reduction suit.
            ImageReadParam param = reader.getDefaultReadParam();
            int step = Math.max(1, Math.min(width / (MAX_WIDTH * 2), height / (MAX_HEIGHT * 2)));
            param.setSourceSubsampling(step, step, 0, 0);
            BufferedImage image = reader.read(0, param);
            if (image == null) {
                throw unreadable();
            }
            return image;
        } catch (IOException | RuntimeException e) {
            if (e instanceof AppException app) {
                throw app;
            }
            // JPEG CMYK, fichier tronque, PNG corrompu...
            throw unreadable();
        } finally {
            reader.dispose();
        }
    }

    /** Recadrage centre au format 5:6 (portrait). */
    static BufferedImage cropToRatio(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        int cropWidth = width;
        int cropHeight = height;
        if ((long) width * RATIO_HEIGHT > (long) height * RATIO_WIDTH) {
            cropWidth = Math.max(1, Math.round(height * (float) RATIO_WIDTH / RATIO_HEIGHT));
        } else {
            cropHeight = Math.max(1, Math.round(width * (float) RATIO_HEIGHT / RATIO_WIDTH));
        }
        if (cropWidth == width && cropHeight == height) {
            return image;
        }
        return image.getSubimage((width - cropWidth) / 2, (height - cropHeight) / 2, cropWidth, cropHeight);
    }

    /** Reduit sans jamais agrandir, sur fond blanc (la transparence d'un PNG devient blanche). */
    private static BufferedImage resize(BufferedImage image) {
        int targetWidth = Math.min(image.getWidth(), MAX_WIDTH);
        int targetHeight = Math.max(1, Math.round(targetWidth * (float) image.getHeight() / image.getWidth()));

        BufferedImage current = image;
        // Reduction par moities successives puis une derniere passe : plus net qu'une seule passe bicubique.
        while (current.getWidth() / 2 >= targetWidth && current.getHeight() / 2 >= targetHeight) {
            current = draw(current, current.getWidth() / 2, current.getHeight() / 2);
        }
        return draw(current, targetWidth, targetHeight);
    }

    private static BufferedImage draw(BufferedImage source, int width, int height) {
        BufferedImage target = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = target.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, width, height);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(source, 0, 0, width, height, null);
        } finally {
            g.dispose();
        }
        return target;
    }

    /** JPEG neuf : aucune metadonnee de l'original n'est recopiee (seul l'en-tete JFIF standard est ecrit). */
    private static byte[] encodeJpeg(BufferedImage image) {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             ImageOutputStream stream = ImageIO.createImageOutputStream(out)) {
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            writer.setOutput(stream);
            writer.write(null, new IIOImage(image, null, null), param);
            stream.flush();
            return out.toByteArray();
        } catch (IOException e) {
            throw unreadable();
        } finally {
            writer.dispose();
        }
    }

    private static AppException unreadable() {
        return new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_PHOTO_UNREADABLE);
    }
}
