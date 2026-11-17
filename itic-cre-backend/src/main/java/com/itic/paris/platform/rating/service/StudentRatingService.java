package com.itic.paris.platform.rating.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.gdpr.dto.GdprDataExportDto;
import com.itic.paris.platform.rating.model.StudentRating;
import com.itic.paris.platform.rating.repository.StudentRatingRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Note des etudiants par l'equipe (conseillers et admins) : 1 a 5, commentaire facultatif, historisee (qui, quand),
 * jamais visible de l'etudiant. La derniere note est recopiee sur l'etudiant (colonne triable, filtre « note minimale »).
 */
@Service
@RequiredArgsConstructor
public class StudentRatingService {

    private final StudentRatingRepository ratingRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    public record RatingDto(UUID id, int score, String comment, Instant createdAt, UUID authorId, String authorName,
                            boolean formerStaff) {
    }

    @Transactional(readOnly = true)
    public List<RatingDto> history(UUID studentId) {
        findStudent(studentId);
        return ratingRepository.findHistory(studentId).stream().map(StudentRatingService::toDto).toList();
    }

    @Transactional
    public RatingDto rate(UUID studentId, Integer score, String comment) {
        if (score == null || score < StudentRating.MIN || score > StudentRating.MAX) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.STUDENT_RATING_INVALID);
        }
        String text = comment == null ? null : comment.strip();
        if (text != null && text.length() > StudentRating.COMMENT_MAX) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.STUDENT_RATING_INVALID);
        }
        Student student = findStudent(studentId);
        User author = userRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        StudentRating rating = new StudentRating();
        rating.setStudent(student);
        rating.setAuthor(author);
        rating.setScore(score);
        rating.setComment(text == null || text.isEmpty() ? null : text);
        rating.setCreatedAt(Instant.now());
        ratingRepository.save(rating);

        student.setLatestRating(score);
        studentRepository.save(student);
        return toDto(rating);
    }

    // ─── RGPD ───────────────────────────────────────────────────────────────

    @Transactional
    public void deleteAllFor(Student student) {
        ratingRepository.deleteByStudentId(student.getId());
        student.setLatestRating(null);
        student.setStarRating(null);
    }

    @Transactional(readOnly = true)
    public List<GdprDataExportDto.RatingData> exportFor(UUID studentId) {
        return ratingRepository.findHistory(studentId).stream()
                .map(r -> GdprDataExportDto.RatingData.builder()
                        .date(r.getCreatedAt())
                        .score(r.getScore())
                        .comment(r.getComment())
                        .author(toDto(r).formerStaff() ? "Compte supprimé" : toDto(r).authorName())
                        .build())
                .toList();
    }

    private static RatingDto toDto(StudentRating r) {
        User author = r.getAuthor();
        boolean former = author == null || author.isAnonymized();
        return new RatingDto(r.getId(), r.getScore(), r.getComment(), r.getCreatedAt(),
                former ? null : author.getId(),
                former ? null : (author.getFirstName() + " " + author.getLastName()).strip(),
                former);
    }

    private Student findStudent(UUID studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }
}
