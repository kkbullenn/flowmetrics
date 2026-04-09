package com.flowmetrics.processing.service;

import com.flowmetrics.processing.dto.WorkflowRunPayload;
import com.flowmetrics.processing.entity.*;
import com.flowmetrics.processing.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowRunProcessingService {

    private final RepositoryRepository repositoryRepository;
    private final WorkflowRunRepository workflowRunRepository;
    private final CommitRepository commitRepository;
    private final DeploymentRepository deploymentRepository;
    private final IncidentRepository incidentRepository;
    private final DoraMetricsService doraMetricsService;

    @Transactional
    public void process(WorkflowRunPayload payload) {
        log.debug("Processing workflow run: repo={} run={} conclusion={}",
                payload.getRepository().getFullName(),
                payload.getWorkflowRun().getId(),
                payload.getWorkflowRun().getConclusion());

        // Step 1 — upsert the repository record
        Repository repo = upsertRepository(payload.getRepository());

        // Step 2 — upsert the commit record if head_commit is present
        Commit commit = null;
        if (payload.getWorkflowRun().getHeadCommit() != null) {
            commit = upsertCommit(repo, payload.getWorkflowRun().getHeadCommit());
        }

        // Step 3 — upsert the workflow run record
        WorkflowRun workflowRun = upsertWorkflowRun(repo, payload.getWorkflowRun());

        // Step 4 — only create deployments for runs on the default branch
        String defaultBranch = payload.getRepository().getDefaultBranch();
        String headBranch    = payload.getWorkflowRun().getHeadBranch();

        if (!defaultBranch.equals(headBranch)) {
            log.debug("Skipping deployment — run is on branch '{}', not default branch '{}'",
                    headBranch, defaultBranch);
            return;
        }

        // Step 5 — create the deployment record
        String conclusion      = payload.getWorkflowRun().getConclusion();
        String deploymentStatus = mapConclusionToDeploymentStatus(conclusion);

        Deployment deployment = new Deployment();
        deployment.setRepository(repo);
        deployment.setWorkflowRun(workflowRun);
        deployment.setCommit(commit);
        deployment.setEnvironment("production");
        deployment.setStatus(deploymentStatus);
        deployment.setDeployedAt(payload.getWorkflowRun().getUpdatedAt());

        if (commit != null) {
            deployment.setCommitAuthoredAt(commit.getCommittedAt());
        }

        deploymentRepository.save(deployment);

        log.info("Saved deployment: repo={} status={} deployedAt={}",
                repo.getFullName(), deploymentStatus, deployment.getDeployedAt());

        // Step 6 — incident detection and resolution
        if ("failed".equals(deploymentStatus)) {
            openIncident(repo, deployment);
        } else if ("success".equals(deploymentStatus)) {
            resolveOpenIncident(repo, deployment);
        }

        // Step 7 — recompute DORA metrics snapshots
        doraMetricsService.computeAndSave(repo);
    }

    // ─────────────────────────────────────────
    // Upsert helpers
    // ─────────────────────────────────────────

    private Repository upsertRepository(WorkflowRunPayload.Repository repoPayload) {
        return repositoryRepository.findByGithubRepoId(repoPayload.getId())
                .orElseGet(() -> {
                    Repository repo = new Repository();
                    repo.setGithubRepoId(repoPayload.getId());
                    repo.setOwner(repoPayload.getOwner().getLogin());
                    repo.setName(repoPayload.getName());
                    repo.setFullName(repoPayload.getFullName());
                    repo.setDefaultBranch(repoPayload.getDefaultBranch());
                    Repository saved = repositoryRepository.save(repo);
                    log.info("Created new repository record: {}", saved.getFullName());
                    return saved;
                });
    }

    private Commit upsertCommit(Repository repo, WorkflowRunPayload.HeadCommit headCommit) {
        return commitRepository.findByRepositoryIdAndSha(repo.getId(), headCommit.getId())
                .orElseGet(() -> {
                    Commit commit = new Commit();
                    commit.setRepository(repo);
                    commit.setSha(headCommit.getId());
                    commit.setCommittedAt(headCommit.getTimestamp());
                    commit.setMessage(headCommit.getMessage());
                    if (headCommit.getAuthor() != null) {
                        commit.setAuthor(headCommit.getAuthor().getName());
                    }
                    return commitRepository.save(commit);
                });
    }

    private WorkflowRun upsertWorkflowRun(Repository repo,
                                          WorkflowRunPayload.WorkflowRun runPayload) {
        return workflowRunRepository
                .findByRepositoryIdAndGithubRunId(repo.getId(), runPayload.getId())
                .orElseGet(() -> {
                    WorkflowRun run = new WorkflowRun();
                    run.setRepository(repo);
                    run.setGithubRunId(runPayload.getId());
                    run.setGithubRunNumber(runPayload.getRunNumber());
                    run.setName(runPayload.getName());
                    run.setHeadBranch(runPayload.getHeadBranch());
                    run.setHeadSha(runPayload.getHeadSha());
                    run.setEvent(runPayload.getEvent());
                    run.setStatus(runPayload.getStatus());
                    run.setConclusion(runPayload.getConclusion());
                    run.setRunStartedAt(runPayload.getRunStartedAt());
                    run.setRunCompletedAt(runPayload.getUpdatedAt());
                    return workflowRunRepository.save(run);
                });
    }

    // ─────────────────────────────────────────
    // Incident logic
    // ─────────────────────────────────────────

    private void openIncident(Repository repo, Deployment deployment) {
        Incident incident = new Incident();
        incident.setRepository(repo);
        incident.setTriggeringDeployment(deployment);
        incident.setEnvironment(deployment.getEnvironment());
        incident.setDetectedAt(deployment.getDeployedAt());
        incidentRepository.save(incident);
        log.info("Opened incident for failed deployment: repo={} deployedAt={}",
                repo.getFullName(), deployment.getDeployedAt());
    }

    private void resolveOpenIncident(Repository repo, Deployment resolvingDeployment) {
        incidentRepository
                .findTopByRepositoryIdAndEnvironmentAndResolvedAtIsNullOrderByDetectedAtDesc(
                        repo.getId(), resolvingDeployment.getEnvironment())
                .ifPresent(incident -> {
                    incident.setResolvingDeployment(resolvingDeployment);
                    incident.setResolvedAt(resolvingDeployment.getDeployedAt());
                    incidentRepository.save(incident);
                    log.info("Resolved incident: repo={} detectedAt={} resolvedAt={}",
                            repo.getFullName(),
                            incident.getDetectedAt(),
                            incident.getResolvedAt());
                });
    }

    // ─────────────────────────────────────────
    // Conclusion → deployment status mapping
    // ─────────────────────────────────────────

    private String mapConclusionToDeploymentStatus(String conclusion) {
        return switch (conclusion) {
            case "success" -> "success";
            case "failure", "timed_out", "action_required" -> "failed";
            default -> "failed";
        };
    }
}