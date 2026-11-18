package com.itic.paris.platform.company.repository;

import com.itic.paris.platform.company.model.CompanySpaceProgram;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanySpaceProgramRepository extends JpaRepository<CompanySpaceProgram, UUID> {

    @EntityGraph(attributePaths = "promotions")
    List<CompanySpaceProgram> findAllByOrderBySortOrderAscLabelAsc();

    @EntityGraph(attributePaths = "promotions")
    Optional<CompanySpaceProgram> findBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, UUID id);

    boolean existsBySlug(String slug);
}
