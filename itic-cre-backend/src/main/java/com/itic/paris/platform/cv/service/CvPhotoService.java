package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.cv.model.CvPhoto;
import com.itic.paris.platform.cv.model.CvPhotoFormat;
import com.itic.paris.platform.cv.model.dtos.builder.CvPhotoInfo;
import com.itic.paris.platform.cv.repository.CvPhotoRepository;
import com.itic.paris.platform.cv.service.CvPhotoImages.CropZone;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collections;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Photo du CV (assistant de CV). Par defaut, la photo de profil du compte (JPEG, PNG ou WebP, convertie) ; l'etudiant
 * peut la remplacer par une photo propre au CV, qui ne touche jamais sa photo de profil, puis « revenir a sa photo
 * de profil ».
 * <p>
 * On garde l'ORIGINAL assaini (CvPhotoImages.normalizeOriginal) et la zone choisie au recadrage ; chaque modele en
 * derive son format au rendu (carre ou portrait, CvPhotoImages.renderFormat).
 * <p>
 * Stockage : meme service de fichiers que les avatars, mais dossier PRIVE (cv-photos/{studentId}-{horodatage}.jpg,
 * jamais sous le dossier public) : aucune URL n'est donnee, l'image passe par les points d'acces de l'assistant,
 * reserves a l'etudiant lui-meme et aux conseillers et admins (comme le CV). En stockage local, FileAccessFilter
 * applique la meme regle grace au prefixe {studentId}-.
 */
@Slf4j
@Service
public class CvPhotoService {

    /** Taille maximale d'une photo : envoyee pour le CV, ou photo de profil reprise dans le CV (meme regle). */
    public static final long MAX_BYTES = 5L * 1024 * 1024;
    static final String FOLDER = "cv-photos/";
    /** Originaux assainis en memoire (jusqu'a 2000 px : quelques centaines de Ko chacun). */
    private static final int ORIGINAL_CACHE_ENTRIES = 16;
    /** Images au format d'un modele (480 px : quelques dizaines de Ko). */
    private static final int RENDER_CACHE_ENTRIES = 64;
    /** Valeur en cache pour « fichier lu mais inutilisable » : pas de nouvel essai a chaque apercu. */
    private static final byte[] UNUSABLE = new byte[0];

    /** Photo du CV : d'ou elle vient, son fichier et la zone choisie. */
    public record Origin(String source, String path, CropZone zone) {
        static final Origin NONE = new Origin(CvPhotoInfo.SOURCE_NONE, null, null);

        public boolean present() {
            return path != null;
        }

        /** Cle stable (empreinte du fichier et de la zone) : empreinte d'envoi, rafraichissement de la vignette. */
        public String key() {
            if (!present()) {
                return null;
            }
            String material = path + "|" + String.format(Locale.ROOT, "%.4f,%.4f,%.4f,%.4f",
                    zone.x(), zone.y(), zone.width(), zone.height());
            try {
                byte[] digest = MessageDigest.getInstance("SHA-256").digest(material.getBytes(StandardCharsets.UTF_8));
                return HexFormat.of().formatHex(digest, 0, 8);
            } catch (NoSuchAlgorithmException e) {
                throw new IllegalStateException("SHA-256 indisponible", e);
            }
        }
    }

    private final ICloudStorage cloudStorage;
    private final CvPhotoRepository photoRepository;
    /**
     * Caches par chemin de stockage (un chemin ne change jamais de contenu : nouvel envoi = nouveau chemin).
     * L'apercu se recalcule a chaque modification : sans eux, chaque frappe retelechargerait et retraiterait la photo.
     */
    private final Map<String, byte[]> originals = lru(ORIGINAL_CACHE_ENTRIES);
    private final Map<String, byte[]> renders = lru(RENDER_CACHE_ENTRIES);

    public CvPhotoService(ICloudStorage cloudStorage, CvPhotoRepository photoRepository) {
        this.cloudStorage = cloudStorage;
        this.photoRepository = photoRepository;
    }

    /** Photo propre au CV si elle existe, sinon photo de profil utilisable, sinon aucune. */
    public Origin origin(Student student) {
        CvPhoto own = photoRepository.findById(student.getId()).orElse(null);
        if (own != null && original(own.getStoragePath()) != null) {
            return new Origin(CvPhotoInfo.SOURCE_CV, own.getStoragePath(), zoneOf(own));
        }
        return profilePhotoUsable(student)
                ? new Origin(CvPhotoInfo.SOURCE_PROFILE, student.getProfilePicture(), CropZone.FULL)
                : Origin.NONE;
    }

    /** Image du PDF au format demande (JPEG sans metadonnees), ou null sans photo. */
    public byte[] render(Student student, CvPhotoFormat format) {
        Origin origin = origin(student);
        if (!origin.present()) {
            return null;
        }
        String cacheKey = origin.key() + "|" + format.name();
        byte[] cached = renders.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        byte[] original = original(origin.path());
        if (original == null) {
            return null;
        }
        try {
            byte[] rendered = CvPhotoImages.renderFormat(original, origin.zone(), format);
            renders.put(cacheKey, rendered);
            return rendered;
        } catch (AppException e) {
            log.warn("Photo de CV impossible a mettre au format {} : {}", format, origin.path());
            return null;
        }
    }

    public CvPhotoInfo info(Student student) {
        Origin origin = origin(student);
        boolean profileAvailable = CvPhotoInfo.SOURCE_PROFILE.equals(origin.source()) || profilePhotoUsable(student);
        return new CvPhotoInfo(origin.source(), profileAvailable, origin.key());
    }

    /** Une photo peut aller dans le CV (case « Afficher ma photo » cochee par defaut). */
    public boolean hasPhoto(Student student) {
        return origin(student).present();
    }

    /**
     * Enregistre une photo propre au CV : l'original assaini (CvPhotoImages : vrai type JPEG ou PNG, dimensions,
     * orientation, sans EXIF) et la zone choisie au recadrage (null : toute l'image). Remplace la precedente photo du
     * CV ; la photo de profil n'est pas touchee.
     */
    @Transactional
    public CvPhotoInfo upload(Student student, MultipartFile file, CropZone zone) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_PHOTO_INVALID_TYPE);
        }
        if (file.getSize() > MAX_BYTES) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_PHOTO_TOO_LARGE);
        }
        byte[] original = CvPhotoImages.normalizeOriginal(file.getBytes(), false);

        // Prefixe {studentId}- obligatoire : FileAccessFilter s'en sert pour reconnaitre le proprietaire (stockage local).
        String path = FOLDER + student.getId() + "-" + System.currentTimeMillis() + ".jpg";
        if (!cloudStorage.uploadFile(new ByteArrayInputStream(original), path, "image/jpeg", original.length)) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.REQUEST_PROCESSING_FAILED);
        }

        CvPhoto photo = photoRepository.findById(student.getId()).orElseGet(() -> {
            CvPhoto created = new CvPhoto();
            created.setStudentId(student.getId());
            return created;
        });
        String previous = photo.getStoragePath();
        CropZone kept = zone == null ? CropZone.FULL : zone;
        photo.setStoragePath(path);
        photo.setCropX(kept.x());
        photo.setCropY(kept.y());
        photo.setCropWidth(kept.width());
        photo.setCropHeight(kept.height());
        photoRepository.save(photo);
        originals.put(path, original);
        if (previous != null && !previous.equals(path)) {
            deleteQuietly(previous);
        }
        return info(student);
    }

    /** « Revenir a ma photo de profil » : supprime la photo propre au CV (fichier compris). */
    @Transactional
    public CvPhotoInfo removeCvPhoto(Student student) {
        deleteAllFor(student.getId());
        return info(student);
    }

    /** Suppression du compte (RGPD) ou retour a la photo de profil : ligne et fichier. */
    @Transactional
    public void deleteAllFor(UUID studentId) {
        photoRepository.findById(studentId).ifPresent(photo -> {
            photoRepository.delete(photo);
            deleteQuietly(photo.getStoragePath());
        });
    }

    private boolean profilePhotoUsable(Student student) {
        return student.getProfilePicture() != null && original(student.getProfilePicture()) != null;
    }

    private static CropZone zoneOf(CvPhoto photo) {
        if (photo.getCropX() == null || photo.getCropY() == null || photo.getCropWidth() == null || photo.getCropHeight() == null) {
            return CropZone.FULL;
        }
        return new CropZone(photo.getCropX(), photo.getCropY(), photo.getCropWidth(), photo.getCropHeight());
    }

    /**
     * Original assaini du fichier stocke, ou null s'il est absent ou inutilisable. Memes regles qu'un envoi : vrai
     * type (JPEG, PNG, et WebP pour une photo de profil, converti), 5 Mo au plus, dimensions, sans EXIF.
     * Une erreur de stockage n'est pas mise en cache (nouvel essai au prochain apercu) ; un fichier inutilisable l'est.
     */
    private byte[] original(String path) {
        byte[] cached = originals.get(path);
        if (cached != null) {
            return cached == UNUSABLE ? null : cached;
        }
        byte[] raw;
        try (InputStream in = cloudStorage.downloadFile(path)) {
            if (in == null) {
                return null;
            }
            raw = in.readNBytes((int) MAX_BYTES + 1);
        } catch (IOException | RuntimeException e) {
            log.warn("Photo de CV illisible depuis le stockage : {}", path);
            return null;
        }
        byte[] normalized;
        try {
            normalized = raw.length > MAX_BYTES ? null : CvPhotoImages.normalizeOriginal(raw, true);
        } catch (AppException e) {
            normalized = null;
        }
        originals.put(path, normalized == null ? UNUSABLE : normalized);
        return normalized;
    }

    private void deleteQuietly(String path) {
        originals.remove(path);
        try {
            cloudStorage.deleteFile(path);
        } catch (RuntimeException e) {
            log.warn("Suppression impossible de l'ancienne photo de CV : {}", path, e);
        }
    }

    private static Map<String, byte[]> lru(int entries) {
        return Collections.synchronizedMap(new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, byte[]> eldest) {
                return size() > entries;
            }
        });
    }
}
