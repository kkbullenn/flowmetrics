package com.flowmetrics.processing.repository;

import com.flowmetrics.processing.entity.WorkflowRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkflowRunRepository extends JpaRepository<WorkflowRun, UUID> {
    Optional<WorkflowRun> findByRepositoryIdAndGithubRunId(UUID repositoryId, Long githubRunId);
}