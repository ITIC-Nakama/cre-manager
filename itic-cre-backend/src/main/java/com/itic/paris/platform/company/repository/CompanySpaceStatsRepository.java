package com.itic.paris.platform.company.repository;

import com.itic.paris.platform.company.model.CompanySpaceDailyStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface CompanySpaceStatsRepository extends JpaRepository<CompanySpaceDailyStat, CompanySpaceDailyStat.Key> {

    @Modifying
    @Query("UPDATE CompanySpaceDailyStat s SET s.pageViews = s.pageViews + :pages, s.cvViews = s.cvViews + :cvs "
            + "WHERE s.id.day = :day AND s.id.programId = :programId")
    int increment(@Param("day") LocalDate day, @Param("programId") UUID programId,
                  @Param("pages") int pages, @Param("cvs") int cvs);

    @Query("SELECT s.id.programId, sum(s.pageViews), sum(s.cvViews) FROM CompanySpaceDailyStat s "
            + "WHERE s.id.day >= :since GROUP BY s.id.programId")
    List<Object[]> totalsSince(@Param("since") LocalDate since);
}
