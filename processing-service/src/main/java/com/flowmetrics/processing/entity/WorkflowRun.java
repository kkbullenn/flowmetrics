package com.flowmetrics.processing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "workflow_runs")
public class WorkflowRun {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @Column(name = "github_run_id", nullable = false)
    private Long githubRunId;

    @Column(name = "github_run_number", nullable = false)
    private Integer githubRunNumber;

    @Column(nullable = false)
    private String name;

    @Column(name = "head_branch", nullable = false)
    private String headBranch;

    @Column(name = "head_sha", nullable = false)
    private String headSha;

    @Column(nullable = false)
    private String event;

    @Column(nullable = false, columnDefinition = "workflow_status")
    private String status;

    @Column(columnDefinition = "workflow_conclusion")
    private String conclusion;

    @Column(name = "run_started_at", nullable = false)
    private Instant runStartedAt;

    @Column(name = "run_completed_at")
    private Instant runCompletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}