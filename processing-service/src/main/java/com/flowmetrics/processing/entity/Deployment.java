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
@Table(name = "deployments")
public class Deployment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_run_id", nullable = false)
    private WorkflowRun workflowRun;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commit_id")
    private Commit commit;

    @Column(nullable = false)
    private String environment = "production";

    @Column(nullable = false, columnDefinition = "deployment_status")
    private String status;

    @Column(name = "deployed_at", nullable = false)
    private Instant deployedAt;

    @Column(name = "commit_authored_at")
    private Instant commitAuthoredAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}