package com.itic.paris.platform.auth.repository;

import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    /**
     * Verrouille les lignes des admins actifs (SELECT ... FOR UPDATE) le temps de la transaction,
     * pour que deux (des)activations concurrentes ne puissent pas lire le meme compte avant
     * que l'une des deux n'ait commite (TOCTOU sur la protection du dernier admin / le plafond).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.role.name = :role AND u.active = true")
    List<User> findActiveByRoleForUpdate(@Param("role") RoleEnum role);

    /** Étudiants désactivés depuis plus de X jours — utilisé par le scheduler RGPD pour l'anonymisation. */
    @Query("SELECT u FROM User u WHERE TYPE(u) = com.itic.paris.platform.auth.model.Student " +
            "AND u.active = false AND u.deactivatedAt IS NOT NULL AND u.deactivatedAt < :cutoff")
    List<User> findDeactivatedStudentsForAnonymization(@Param("cutoff") Instant cutoff);

    @Query("SELECT u FROM User u WHERE u.role.name = :role " +
            "AND (:search IS NULL OR :search = '' " +
            "OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> findByRoleNameAndSearch(@Param("role") RoleEnum role, @Param("search") String search, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.role.name IN (com.itic.paris.platform.auth.model.enums.RoleEnum.ADVISOR, com.itic.paris.platform.auth.model.enums.RoleEnum.ADMIN) " +
            "AND (:search IS NULL OR :search = '' " +
            "OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> findAllStaffBySearch(@Param("search") String search, Pageable pageable);
}




