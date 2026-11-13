package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.cv.model.CvPhoto;
import com.itic.paris.platform.cv.model.dtos.builder.CvPhotoInfo;
import com.itic.paris.platform.cv.repository.CvPhotoRepository;
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
import java.util.Map;
import java.util.UUID;

/**
 * Photo du CV (assistant de CV). Par defaut, la photo de profil du compte ; l'etudiant peut la remplacer par une
 * photo propre au CV, qui ne touche jamais sa photo de profil, puis « revenir a sa photo de profil ».
 * <p>
 * Stockage : meme service de fichiers que les avatars, mais dossier PRIVE (cv-photos/{studentId}-{horodatage}.jpg,
 * jamais sous le dossier public) : aucune URL n'est donnee, l'image passe par les points d'acces de l'assistant,
 * reserves a l'etudiant lui-meme et aux conseillers et admins (comme le CV). En stockage local, FileAccessFilter
 * applique la meme regle grace au prefixe {studentId}-.
 */
@Slf4j
@Service
public class CvPhotoService {

    /** Taille maximale du fichier envoye. */
    public static final long MAX_BYTES = 5L * 1024 * 1024;
    /** Photo de profil a reprendre : au-dela, elle est ignoree (le compte accepte jusqu'a 15 Mo). */
    private static final int MAX_PROFILE_BYTES = 20 * 1024 * 1024;
    static final String FOLDER = "cv-photos/";
    private static final int CACHE_ENTRIES = 64;
    /** Valeur en cache pour « fichier lu mais inutilisable » (WebP, illisible) : pas de nouvel essai a chaque apercu. */
    private static final byte[] UNUSABLE = new byte[0];

    /** Photo effective du CV, deja traitee (JPEG 5:6 sans metadonnees). */
    public record Resolved(String source, String path, byte[] jpeg) {
        static final Resolved NONE = new Resolved(CvPhotoInfo.SOURCE_NONE, null, null);

        public boolean present() {
            return jpeg != null;
        }
    }

    private final ICloudStorage cloudStorage;
    private final CvPhotoRepository photoRepository;
    /**
     * Images traitees par chemin de stockage (un chemin ne change jamais de contenu : nouvel envoi = nouveau chemin).
     * L'apercu se recalcule a chaque modification : sans ce cache, chaque frappe retelechargerait la photo.
     */
    private final Map<String, byte[]> cache = Collections.synchronizedMap(new LinkedHashMap<>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, byte[]> eldest) {
            return size() > CACHE_ENTRIES;
        }
    });

    public CvPhotoService(ICloudStorage cloudStorage, CvPhotoRepository photoRepository) {
        this.cloudStorage = cloudStorage;
        this.photoRepository = photoRepository;
    }

    /** Photo propre au CV si elle existe, sinon photo de profil utilisable, sinon aucune. */
    public Resolved resolve(Student student) {
        CvPhoto own = photoRepository.findById(student.getId()).orElse(null);
        if (own != null) {
            byte[] bytes = load(own.getStoragePath());
            if (bytes != null) {
                return new Resolved(CvPhotoInfo.SOURCE_CV, own.getStoragePath(), bytes);
            }
        }
        byte[] profile = profilePhoto(student);
        return profile != null
                ? new Resolved(CvPhotoInfo.SOURCE_PROFILE, student.getProfilePicture(), profile)
                : Resolved.NONE;
    }

    public CvPhotoInfo info(Student student) {
        Resolved resolved = resolve(student);
        boolean profileAvailable = CvPhotoInfo.SOURCE_PROFILE.equals(resolved.source()) || profilePhoto(student) != null;
        return new CvPhotoInfo(resolved.source(), profileAvailable, resolved.present() ? key(resolved.path()) : null);
    }

    /** Une photo peut aller dans le CV (case « Afficher ma photo » cochee par defaut). */
    public boolean hasPhoto(Student student) {
        return resolve(student).present();
    }

    /**
     * Enregistre une photo propre au CV : verifiee, recadree, re-encodee sans EXIF (CvPhotoImages). Remplace la
     * precedente photo du CV ; la photo de profil n'est pas touchee.
     */
    @Transactional
    public CvPhotoInfo upload(Student student, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_PHOTO_INVALID_TYPE);
        }
        if (file.getSize() > MAX_BYTES) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_PHOTO_TOO_LARGE);
        }
        byte[] jpeg = CvPhotoImages.process(file.getBytes());

        // Prefixe {studentId}- obligatoire : FileAccessFilter s'en sert pour reconnaitre le proprietaire (stockage local).
        String path = FOLDER + student.getId() + "-" + System.currentTimeMillis() + ".jpg";
        if (!cloudStorage.uploadFile(new ByteArrayInputStream(jpeg), path, "image/jpeg", jpeg.length)) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.REQUEST_PROCESSING_FAILED);
        }

        CvPhoto photo = photoRepository.findById(student.getId()).orElseGet(() -> {
            CvPhoto created = new CvPhoto();
            created.setStudentId(student.getId());
            return created;
        });
        String previous = photo.getStoragePath();
        photo.setStoragePath(path);
        photoRepository.save(photo);
        cache.put(path, jpeg);
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

    /** Cle stable d'une photo (empreinte de son chemin) : sert a l'empreinte d'envoi et au rafraichissement. */
    static String key(String path) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(path.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest, 0, 8);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponible", e);
        }
    }

    private byte[] profilePhoto(Student student) {
        return student.getProfilePicture() == null ? null : load(student.getProfilePicture());
    }

    /**
     * Image traitee (CvPhotoImages) du fichier stocke, ou null s'il est absent ou inutilisable. Une erreur de
     * stockage n'est pas mise en cache (nouvel essai au prochain apercu) ; un fichier inutilisable (WebP...) l'est.
     */
    private byte[] load(String path) {
        byte[] cached = cache.get(path);
        if (cached != null) {
            return cached == UNUSABLE ? null : cached;
        }
        byte[] raw;
        try (InputStream in = cloudStorage.downloadFile(path)) {
            if (in == null) {
                return null;
            }
            raw = in.readNBytes(MAX_PROFILE_BYTES + 1);
        } catch (IOException | RuntimeException e) {
            log.warn("Photo de CV illisible depuis le stockage : {}", path);
            return null;
        }
        byte[] processed;
        try {
            processed = raw.length > MAX_PROFILE_BYTES ? null : CvPhotoImages.process(raw);
        } catch (AppException e) {
            processed = null;
        }
        cache.put(path, processed == null ? UNUSABLE : processed);
        return processed;
    }

    private void deleteQuietly(String path) {
        cache.remove(path);
        try {
            cloudStorage.deleteFile(path);
        } catch (RuntimeException e) {
            log.warn("Suppression impossible de l'ancienne photo de CV : {}", path, e);
        }
    }
}
