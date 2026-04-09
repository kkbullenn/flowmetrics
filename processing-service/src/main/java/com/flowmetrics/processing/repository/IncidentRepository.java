package com.flowmetrics.processing.repository;

import com.flowmetrics.processing.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, UUID> {

    Optional<Incident> findTopByRepositoryIdAndEnvironmentAndResolvedAtIsNullOrderByDetectedAtDesc(
            UUID repositoryId, String environment);

    // Returns rows of [time_to_recovery_seconds] for resolved incidents in the window
    @Query(value = """
            SELECT time_to_recovery_seconds
            FROM incidents
            WHERE repository_id = :repoId
              AND resolved_at IS NOT NULL
              AND detected_at BETWEEN :start AND :end
            """, nativeQuery = true)
    List<Integer> findResolvedIncidentStatsInWindow(
            @Param("repoId") UUID repoId,
            @Param("start") Instant start,
            @Param("end") Instant end);
}