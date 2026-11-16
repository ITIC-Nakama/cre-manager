package com.itic.paris.platform.matching;

import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mots du CV validé d'un étudiant (texte du PDF, assistant ou dépôt), pour le score de rapprochement. Gardés en mémoire
 * tant que le CV ne change pas ; jamais stockés en base ni renvoyés par l'API.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CvTextService {

    private static final int MAX_CACHE = 2000;

    private record Entry(Instant version, Set<String> words) {
    }

    private final ICloudStorage cloudStorage;
    private final Map<UUID, Entry> cache = new ConcurrentHashMap<>();

    public Set<String> words(CV cv) {
        if (cv == null || cv.getFilePath() == null) {
            return Set.of();
        }
        Instant version = Objects.requireNonNullElse(cv.getUpdatedAt(), cv.getUploadedAt());
        Entry cached = cache.get(cv.getId());
        if (cached != null && Objects.equals(cached.version(), version)) {
            return cached.words();
        }
        Set<String> words = new HashSet<>();
        try (InputStream in = cloudStorage.downloadFile(cv.getFilePath());
             PDDocument document = Loader.loadPDF(in.readAllBytes())) {
            words.addAll(OfferMatchingService.words(new PDFTextStripper().getText(document)));
        } catch (Exception e) {
            log.debug("CV {} illisible pour le rapprochement : {}", cv.getId(), e.getMessage());
        }
        if (cache.size() >= MAX_CACHE) {
            cache.clear();
        }
        cache.put(cv.getId(), new Entry(version, words));
        return words;
    }
}
