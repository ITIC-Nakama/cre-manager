package com.itic.paris.platform.cv.repository;

import com.itic.paris.platform.cv.model.CvPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CvPhotoRepository extends JpaRepository<CvPhoto, UUID> {
}
