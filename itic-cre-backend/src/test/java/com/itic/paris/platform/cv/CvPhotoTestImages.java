package com.itic.paris.platform.cv;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.CRC32;

/** Images de test pour la photo du CV (fabriquees ici : aucune vraie photo de personne). */
public final class CvPhotoTestImages {

    /** Texte place dans les EXIF de test : il ne doit jamais ressortir du traitement. */
    public static final String GPS_MARKER = "GPS 48.8566N 2.3522E rue de test";

    private CvPhotoTestImages() {
    }

    public static byte[] jpeg(int width, int height, Color color) throws IOException {
        return encode(solid(width, height, color, BufferedImage.TYPE_INT_RGB), "jpg");
    }

    public static byte[] png(int width, int height, Color color) throws IOException {
        return encode(solid(width, height, color, BufferedImage.TYPE_INT_RGB), "png");
    }

    /** PNG entierement transparent sauf un carre rouge au centre. */
    public static byte[] transparentPng(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.RED);
        g.fillRect(width / 4, height / 4, width / 2, height / 2);
        g.dispose();
        return encode(image, "png");
    }

    /**
     * JPEG avec un vrai bloc EXIF (APP1) juste apres SOI : description et bloc GPS (latitude « N »), comme une photo de
     * telephone. Le texte GPS_MARKER est dans la description.
     */
    public static byte[] withExif(byte[] jpeg) {
        byte[] marker = (GPS_MARKER + "\0").getBytes(StandardCharsets.US_ASCII);
        ByteBuffer tiff = ByteBuffer.allocate(56 + marker.length);
        tiff.put(new byte[]{'M', 'M', 0, 0x2A, 0, 0, 0, 8});
        // IFD0 : ImageDescription (ASCII, en 56) et pointeur GPSInfo (IFD GPS en 38).
        tiff.putShort((short) 2);
        tiff.putShort((short) 0x010E).putShort((short) 2).putInt(marker.length).putInt(56);
        tiff.putShort((short) 0x8825).putShort((short) 4).putInt(1).putInt(38);
        tiff.putInt(0);
        // IFD GPS : GPSLatitudeRef = "N".
        tiff.putShort((short) 1);
        tiff.putShort((short) 0x0001).putShort((short) 2).putInt(2).put(new byte[]{'N', 0, 0, 0});
        tiff.putInt(0);
        tiff.put(marker);

        byte[] exifHeader = {'E', 'x', 'i', 'f', 0, 0};
        int segmentLength = 2 + exifHeader.length + tiff.capacity();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(jpeg, 0, 2);
        out.write(0xFF);
        out.write(0xE1);
        out.write(segmentLength >> 8);
        out.write(segmentLength & 0xFF);
        out.writeBytes(exifHeader);
        out.writeBytes(tiff.array());
        out.write(jpeg, 2, jpeg.length - 2);
        return out.toByteArray();
    }

    /**
     * JPEG avec un bloc EXIF ne contenant que l'etiquette Orientation (1 a 8), comme une photo de telephone tenu
     * en portrait (6 = a tourner de 90 degres vers la droite pour l'afficher).
     */
    public static byte[] withOrientation(byte[] jpeg, int orientation) {
        ByteBuffer tiff = ByteBuffer.allocate(26);
        tiff.put(new byte[]{'M', 'M', 0, 0x2A, 0, 0, 0, 8});
        tiff.putShort((short) 1);
        tiff.putShort((short) 0x0112).putShort((short) 3).putInt(1).putShort((short) orientation).putShort((short) 0);
        tiff.putInt(0);
        byte[] exifHeader = {'E', 'x', 'i', 'f', 0, 0};
        int segmentLength = 2 + exifHeader.length + tiff.capacity();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(jpeg, 0, 2);
        out.write(0xFF);
        out.write(0xE1);
        out.write(segmentLength >> 8);
        out.write(segmentLength & 0xFF);
        out.writeBytes(exifHeader);
        out.writeBytes(tiff.array());
        out.write(jpeg, 2, jpeg.length - 2);
        return out.toByteArray();
    }

    /**
     * Photo 1000 x 1200 : fond bleu, carre ROUGE de 400 x 400 en (500, 100) et bande verte en haut a gauche. Sert a
     * verifier qu'une image derivee est centree sur la zone choisie (le centre de l'image derivee est rouge).
     */
    public static byte[] markedPhoto() throws IOException {
        BufferedImage image = new BufferedImage(1000, 1200, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.BLUE);
        g.fillRect(0, 0, 1000, 1200);
        g.setColor(Color.RED);
        g.fillRect(500, 100, 400, 400);
        g.setColor(Color.GREEN);
        g.fillRect(0, 0, 100, 100);
        g.dispose();
        return encode(image, "jpg");
    }

    /** Fichier de src/test/resources/cv/ (images WebP de test, dessinees). */
    public static byte[] resource(String name) throws IOException {
        try (var in = CvPhotoTestImages.class.getResourceAsStream("/cv/" + name)) {
            if (in == null) {
                throw new IOException("ressource introuvable : " + name);
            }
            return in.readAllBytes();
        }
    }

    /** PNG valide dont l'en-tete annonce une image geante (width x height) : sans donnees d'image. */
    public static byte[] pngHeaderOnly(int width, int height) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A});
        ByteBuffer ihdr = ByteBuffer.allocate(13).putInt(width).putInt(height).put((byte) 8).put((byte) 2)
                .put((byte) 0).put((byte) 0).put((byte) 0);
        chunk(out, "IHDR", ihdr.array());
        chunk(out, "IEND", new byte[0]);
        return out.toByteArray();
    }

    /** Codes des segments d'un JPEG jusqu'au debut des donnees (SOS) : 0xE1 = APP1 (EXIF). */
    public static List<Integer> jpegSegments(byte[] jpeg) {
        List<Integer> markers = new ArrayList<>();
        int i = 2;
        while (i + 4 <= jpeg.length && (jpeg[i] & 0xFF) == 0xFF) {
            int marker = jpeg[i + 1] & 0xFF;
            markers.add(marker);
            if (marker == 0xDA) {
                break;
            }
            int length = ((jpeg[i + 2] & 0xFF) << 8) | (jpeg[i + 3] & 0xFF);
            i += 2 + length;
        }
        return markers;
    }

    public static boolean contains(byte[] haystack, String needle) {
        return new String(haystack, StandardCharsets.ISO_8859_1).contains(needle);
    }

    private static void chunk(ByteArrayOutputStream out, String type, byte[] data) {
        byte[] typeBytes = type.getBytes(StandardCharsets.US_ASCII);
        out.writeBytes(ByteBuffer.allocate(4).putInt(data.length).array());
        out.writeBytes(typeBytes);
        out.writeBytes(data);
        CRC32 crc = new CRC32();
        crc.update(typeBytes);
        crc.update(data);
        out.writeBytes(ByteBuffer.allocate(4).putInt((int) crc.getValue()).array());
    }

    private static BufferedImage solid(int width, int height, Color color, int type) {
        BufferedImage image = new BufferedImage(width, height, type);
        Graphics2D g = image.createGraphics();
        g.setColor(color);
        g.fillRect(0, 0, width, height);
        g.dispose();
        return image;
    }

    private static byte[] encode(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, format, out);
        return out.toByteArray();
    }
}
