package com.itic.paris.platform.rating.repository;

import com.itic.paris.platform.rating.model.StudentRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface StudentRatingRepository extends JpaRepository<StudentRating, UUID> {

    @Query("SELECT r FROM StudentRating r LEFT JOIN FETCH r.author WHERE r.student.id = :studentId ORDER BY r.createdAt DESC, r.id")
    List<StudentRating> findHistory(@Param("studentId") UUID studentId);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM StudentRating r WHERE r.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") UUID studentId);
}
