package com.flowmetrics.processing.repository;

import com.flowmetrics.processing.entity.Deployment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeploymentRepository extends JpaRepository<Deployment, UUID> {

    Optional<Deployment> findByWorkflowRunId(UUID workflowRunId);

    Optional<Deployment> findTopByRepositoryIdAndEnvironmentAndStatusOrderByDeployedAtDesc(
            UUID repositoryId, String environment, String status);

    // Returns rows of [status, lead_time_seconds] for all deployments in the window
    @Query(value = """
            SELECT status, lead_time_seconds
            FROM deployments
            WHERE repository_id = :repoId
              AND deployed_at BETWEEN :start AND :end
            """, nativeQuery = true)
    List<Object[]> findDeploymentStatsInWindow(
            @Param("repoId") UUID repoId,
            @Param("start") Instant start,
            @Param("end") Instant end);
}