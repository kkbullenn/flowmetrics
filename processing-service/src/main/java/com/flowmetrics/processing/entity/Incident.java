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
@Table(name = "incidents")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "triggering_deployment_id", nullable = false)
    private Deployment triggeringDeployment;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolving_deployment_id")
    private Deployment resolvingDeployment;

    @Column(nullable = false)
    private String environment = "production";

    @Column(name = "detected_at", nullable = false)
    private Instant detectedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}