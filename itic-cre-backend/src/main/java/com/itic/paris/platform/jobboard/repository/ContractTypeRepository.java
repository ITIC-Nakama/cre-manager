package com.itic.paris.platform.jobboard.repository;

import com.itic.paris.platform.jobboard.model.ContractType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContractTypeRepository extends JpaRepository<ContractType, UUID> {

    Optional<ContractType> findByLabel(String label);

    List<ContractType> findByActive(Boolean active);
}
