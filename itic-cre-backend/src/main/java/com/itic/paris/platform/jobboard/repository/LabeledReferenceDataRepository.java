package com.itic.paris.platform.jobboard.repository;

import com.itic.paris.platform.jobboard.model.LabeledReferenceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@NoRepositoryBean
public interface LabeledReferenceDataRepository<E extends LabeledReferenceEntity> extends JpaRepository<E, UUID> {

    Optional<E> findByLabel(String label);

    List<E> findByActive(Boolean active);
}
