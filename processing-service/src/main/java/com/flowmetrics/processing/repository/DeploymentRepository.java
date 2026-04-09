package com.flowmetrics.processing.repository;

import com.flowmetrics.processing.entity.Deployment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeploymentRepository extends JpaRepository<Deployment, UUID> {
    Optional<Deployment> findByWorkflowRunId(UUID workflowRunId);

    // Used to find the most recent successful deployment before this one
    // for resolving incidents
    Optional<Deployment> findTopByRepositoryIdAndEnvironmentAndStatusOrderByDeployedAtDesc(
            UUID repositoryId, String environment, String status);
}