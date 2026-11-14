package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.cv.model.CvPhotoFormat;
import com.itic.paris.platform.shared.local.MessageKey;
import com.twelvemonkeys.imageio.plugins.webp.WebPImageReaderSpi;
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
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Optional;

/**
 * Traitement des photos de CV, pour la photo propre au CV comme pour la photo de profil reprise dans le CV.
 * <p>
 * 1. {@link #normalizeOriginal} : la photo d'ORIGINE, gardee telle quelle (pas recadree) mais assainie :
 * <ul>
 *   <li>vrai type du fichier : signature JPEG, PNG ou WebP (lu par TwelveMonkeys, Java pur) ; ni l'extension ni
 *       le Content-Type annonce ne comptent ;</li>
 *   <li>dimensions lues AVANT le decodage et bornees (pas d'image « bombe ») ;</li>
 *   <li>orientation EXIF (JPEG, ou bloc EXIF d'un WebP) appliquee aux pixels (photo de telephone), puis reduction a
 *       2000 px de cote au plus ;</li>
 *   <li>re-encodage JPEG sur fond blanc, SANS aucune metadonnee : EXIF (position GPS, appareil, date) supprime.</li>
 * </ul>
 * 2. {@link #renderFormat} : l'image du PDF, derivee a chaque modele depuis l'original et la zone choisie par
 * l'etudiant au recadrage ({@link #derivedCrop}) : carre pour le Lineaire, portrait 5:6 pour les autres.
 */
public final class CvPhotoImages {

    /** Cote maximal de l'original garde (largement assez pour un emplacement de 28 mm a 300 ppp). */
    static final int MAX_ORIGINAL_SIDE = 2000;
    /** Au-dela, l'image est refusee sans etre decodee. */
    static final int MAX_SIDE = 12_000;
    static final long MAX_PIXELS = 50_000_000L;
    private static final float JPEG_QUALITY = 0.9f;

    public enum Kind { JPEG, PNG, WEBP }

    /** Zone choisie au recadrage, en fractions (0 a 1) de la photo d'origine orientee. */
    public record CropZone(double x, double y, double width, double height) {
        public static final CropZone FULL = new CropZone(0, 0, 1, 1);
        private static final double TOLERANCE = 0.001;
        private static final double MIN_SIDE = 0.02;

        /**
         * Zone envoyee par le client : les quatre valeurs ou aucune (toute l'image). Bornee a l'image.
         * @throws AppException 400 CV_PHOTO_INVALID_CROP si elle n'a pas de sens
         */
        public static CropZone of(Double x, Double y, Double width, Double height) {
            if (x == null && y == null && width == null && height == null) {
                return FULL;
            }
            if (x == null || y == null || width == null || height == null
                    || !Double.isFinite(x) || !Double.isFinite(y) || !Double.isFinite(width) || !Double.isFinite(height)
                    || x < -TOLERANCE || y < -TOLERANCE || width < MIN_SIDE || height < MIN_SIDE
                    || x + width > 1 + TOLERANCE || y + height > 1 + TOLERANCE) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_PHOTO_INVALID_CROP);
            }
            double cx = Math.max(0, x);
            double cy = Math.max(0, y);
            return new CropZone(cx, cy, Math.min(width, 1 - cx), Math.min(height, 1 - cy));
        }
    }

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
        if (bytes.length > 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return Optional.of(Kind.WEBP);
        }
        return Optional.empty();
    }

    /**
     * Original assaini : JPEG, PNG ou WebP verifie, oriente, 2000 px au plus, re-encode en JPEG sans metadonnees.
     * Memes regles pour une photo envoyee pour le CV et pour la photo de profil reprise dans le CV.
     * @throws AppException 400 CV_PHOTO_INVALID_TYPE (mauvais type) ou CV_PHOTO_UNREADABLE (illisible, trop grande)
     */
    public static byte[] normalizeOriginal(byte[] input) {
        Kind kind = sniff(input)
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_PHOTO_INVALID_TYPE));
        BufferedImage decoded = decode(input, kind, MAX_ORIGINAL_SIDE);
        int orientation = kind == Kind.PNG ? 1 : exifOrientation(input);
        double scale = Math.min(1, (double) MAX_ORIGINAL_SIDE / Math.max(decoded.getWidth(), decoded.getHeight()));
        int width = Math.max(1, (int) Math.round(decoded.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(decoded.getHeight() * scale));
        // Reduire AVANT de tourner : la rotation, pixel par pixel, porte sur 2000 px de cote au plus, pas sur les
        // 12 Mpx d'une photo de telephone (le resultat est le meme, la rotation et la reduction commutent).
        return encodeJpeg(orient(resize(decoded, width, height), orientation));
    }

    /** Image du PDF au format du modele, centree sur la zone choisie (original deja assaini). */
    public static byte[] renderFormat(byte[] normalizedOriginal, CropZone zone, CvPhotoFormat format) {
        BufferedImage original = decode(normalizedOriginal, Kind.JPEG, Integer.MAX_VALUE);
        Rectangle crop = derivedCrop(original.getWidth(), original.getHeight(), zone, format);
        BufferedImage cropped = original.getSubimage(crop.x, crop.y, crop.width, crop.height);
        int width = Math.min(format.outputWidth(), crop.width);
        int height = Math.max(1, (int) Math.round(width / format.ratio()));
        return encodeJpeg(resize(cropped, width, height));
    }

    /**
     * Rectangle au format du modele, centre sur la zone choisie et la contenant entierement (le visage cadre par
     * l'etudiant n'est jamais coupe) ; recale dans l'image, et reduit seulement si l'image est trop petite.
     * Sans zone (toute l'image) : le plus grand rectangle centre au bon format.
     */
    static Rectangle derivedCrop(int width, int height, CropZone zone, CvPhotoFormat format) {
        double ratio = format.ratio();
        double zoneWidth = zone.width() * width;
        double zoneHeight = zone.height() * height;
        double centerX = zone.x() * width + zoneWidth / 2;
        double centerY = zone.y() * height + zoneHeight / 2;

        double w = zoneWidth / zoneHeight < ratio ? zoneHeight * ratio : zoneWidth;
        double h = w / ratio;
        if (w > width) {
            w = width;
            h = w / ratio;
        }
        if (h > height) {
            h = height;
            w = h * ratio;
        }
        double x = Math.min(Math.max(centerX - w / 2, 0), width - w);
        double y = Math.min(Math.max(centerY - h / 2, 0), height - h);
        int ix = (int) Math.round(x);
        int iy = (int) Math.round(y);
        int iw = Math.max(1, Math.min((int) Math.round(w), width - ix));
        int ih = Math.max(1, Math.min((int) Math.round(h), height - iy));
        return new Rectangle(ix, iy, iw, ih);
    }

    // ─── Decodage ────────────────────────────────────────────────────────────

    private static BufferedImage decode(byte[] input, Kind kind, int targetSide) {
        ImageReader reader = reader(kind);
        try (ImageInputStream stream = ImageIO.createImageInputStream(new ByteArrayInputStream(input))) {
            // ignoreMetadata : les blocs EXIF ne sont pas lus par le decodeur (l'orientation est lue a part).
            reader.setInput(stream, true, true);
            int width = reader.getWidth(0);
            int height = reader.getHeight(0);
            if (width <= 0 || height <= 0 || width > MAX_SIDE || height > MAX_SIDE || (long) width * height > MAX_PIXELS) {
                throw unreadable();
            }
            // Grande photo d'appareil : on ne decode qu'un pixel sur n (memoire bornee), la reduction suit. JPEG et PNG
            // gardent au moins 2 fois la taille visee (reduction plus nette) ; le WebP, lu par un decodeur Java pur
            // (lent : 2 s pour 12 Mpx), est decode directement pres de la taille gardee.
            ImageReadParam param = reader.getDefaultReadParam();
            long divisor = kind == Kind.WEBP ? (long) targetSide : 2L * targetSide;
            int step = (int) Math.max(1, Math.max(width, height) / divisor);
            if (step > 1) {
                param.setSourceSubsampling(step, step, 0, 0);
            }
            BufferedImage image = reader.read(0, param);
            if (image == null) {
                throw unreadable();
            }
            return image;
        } catch (IOException | RuntimeException e) {
            if (e instanceof AppException app) {
                throw app;
            }
            // JPEG CMYK, fichier tronque, PNG ou WebP corrompu...
            throw unreadable();
        } finally {
            reader.dispose();
        }
    }

    private static ImageReader reader(Kind kind) {
        if (kind == Kind.WEBP) {
            // Instancie directement : ne depend pas de l'enregistrement des greffons ImageIO (jar Spring Boot).
            return new WebPImageReaderSpi().createReaderInstance(null);
        }
        Iterator<ImageReader> readers = ImageIO.getImageReadersByFormatName(kind == Kind.JPEG ? "jpeg" : "png");
        if (!readers.hasNext()) {
            throw unreadable();
        }
        return readers.next();
    }

    // ─── Orientation EXIF ────────────────────────────────────────────────────

    /**
     * Valeur EXIF « Orientation » (1 a 8) d'un JPEG ou d'un WebP, 1 si absente ou illisible. Les telephones
     * enregistrent souvent l'image couchee avec cette etiquette : comme les EXIF sont supprimes, l'orientation est
     * appliquee aux pixels.
     */
    static int exifOrientation(byte[] image) {
        Kind kind = sniff(image).orElse(null);
        try {
            if (kind == Kind.JPEG) {
                return jpegOrientation(image);
            }
            if (kind == Kind.WEBP) {
                return webpOrientation(image);
            }
        } catch (RuntimeException e) {
            return 1;
        }
        return 1;
    }

    /** JPEG : segment APP1 « Exif » (et deux octets nuls), puis un en-tete TIFF. */
    private static int jpegOrientation(byte[] jpeg) {
        int i = 2;
        while (i + 4 <= jpeg.length && (jpeg[i] & 0xFF) == 0xFF) {
            int marker = jpeg[i + 1] & 0xFF;
            int length = ((jpeg[i + 2] & 0xFF) << 8) | (jpeg[i + 3] & 0xFF);
            if (marker == 0xDA || length < 2) {
                return 1;
            }
            int payload = i + 4;
            if (marker == 0xE1 && length >= 16 && payload + 6 <= jpeg.length
                    && jpeg[payload] == 'E' && jpeg[payload + 1] == 'x' && jpeg[payload + 2] == 'i' && jpeg[payload + 3] == 'f') {
                return orientationFromTiff(jpeg, payload + 6, Math.min(jpeg.length, i + 2 + length));
            }
            i += 2 + length;
        }
        return 1;
    }

    /**
     * WebP : conteneur RIFF fait de blocs (code de 4 lettres, taille sur 4 octets, contenu aligne sur 2 octets).
     * Le bloc « EXIF » contient un en-tete TIFF, parfois precede de « Exif » et de deux octets nuls selon l'outil
     * qui l'a ecrit.
     */
    private static int webpOrientation(byte[] webp) {
        int i = 12;
        while (i + 8 <= webp.length) {
            long size = readInt(webp, i + 4, true);
            int payload = i + 8;
            if (size > webp.length - payload) {
                return 1;
            }
            int end = payload + (int) size;
            if (webp[i] == 'E' && webp[i + 1] == 'X' && webp[i + 2] == 'I' && webp[i + 3] == 'F') {
                int tiff = payload;
                if (size >= 6 && webp[tiff] == 'E' && webp[tiff + 1] == 'x' && webp[tiff + 2] == 'i' && webp[tiff + 3] == 'f'
                        && webp[tiff + 4] == 0 && webp[tiff + 5] == 0) {
                    tiff += 6;
                }
                return orientationFromTiff(webp, tiff, end);
            }
            i = end + (int) (size & 1);
        }
        return 1;
    }

    private static int orientationFromTiff(byte[] b, int tiff, int end) {
        if (tiff + 8 > end) {
            return 1;
        }
        boolean little = b[tiff] == 'I' && b[tiff + 1] == 'I';
        int ifd = tiff + (int) readInt(b, tiff + 4, little);
        if (ifd < tiff || ifd + 2 > end) {
            return 1;
        }
        int entries = readShort(b, ifd, little);
        for (int n = 0; n < entries; n++) {
            int entry = ifd + 2 + n * 12;
            if (entry + 12 > end) {
                return 1;
            }
            if (readShort(b, entry, little) == 0x0112) {
                int value = readShort(b, entry + 8, little);
                return value >= 1 && value <= 8 ? value : 1;
            }
        }
        return 1;
    }

    private static int readShort(byte[] b, int at, boolean little) {
        return little ? (b[at] & 0xFF) | ((b[at + 1] & 0xFF) << 8) : ((b[at] & 0xFF) << 8) | (b[at + 1] & 0xFF);
    }

    private static long readInt(byte[] b, int at, boolean little) {
        long value = 0;
        for (int k = 0; k < 4; k++) {
            int shift = little ? 8 * k : 8 * (3 - k);
            value |= (long) (b[at + k] & 0xFF) << shift;
        }
        return value;
    }

    /** Applique l'orientation EXIF aux pixels (2 a 8 : miroirs et rotations). */
    static BufferedImage orient(BufferedImage source, int orientation) {
        if (orientation <= 1 || orientation > 8) {
            return source;
        }
        int w = source.getWidth();
        int h = source.getHeight();
        boolean swap = orientation >= 5;
        int dw = swap ? h : w;
        int dh = swap ? w : h;
        int[] in = source.getRGB(0, 0, w, h, null, 0, w);
        int[] out = new int[in.length];
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int dx;
                int dy;
                switch (orientation) {
                    case 2 -> { dx = w - 1 - x; dy = y; }
                    case 3 -> { dx = w - 1 - x; dy = h - 1 - y; }
                    case 4 -> { dx = x; dy = h - 1 - y; }
                    case 5 -> { dx = y; dy = x; }
                    case 6 -> { dx = h - 1 - y; dy = x; }
                    case 7 -> { dx = h - 1 - y; dy = w - 1 - x; }
                    default -> { dx = y; dy = w - 1 - x; }
                }
                out[dy * dw + dx] = in[y * w + x];
            }
        }
        // Meme type que la source quand elle est opaque (le JPEG ne sait pas ecrire de transparence).
        int type = source.getType() == BufferedImage.TYPE_INT_RGB ? BufferedImage.TYPE_INT_RGB : BufferedImage.TYPE_INT_ARGB;
        BufferedImage target = new BufferedImage(dw, dh, type);
        target.setRGB(0, 0, dw, dh, out, 0, dw);
        return target;
    }

    // ─── Reduction et encodage ───────────────────────────────────────────────

    /** Reduit (jamais n'agrandit au-dela de la taille demandee) sur fond blanc : la transparence devient blanche. */
    private static BufferedImage resize(BufferedImage image, int targetWidth, int targetHeight) {
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
            if (source.getWidth() != width || source.getHeight() != height) {
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            }
            // Meme taille : simple copie sur fond blanc (pas d'interpolation, beaucoup plus rapide).
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
