package com.flowmetrics.processing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "dora_metrics_snapshots")
public class DoraMetricsSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id")
    private Repository repository;

    @Column(name = "metric_window", nullable = false, columnDefinition = "metric_window_type")
    private String metricWindow;

    @Column(name = "window_start", nullable = false)
    private Instant windowStart;

    @Column(name = "window_end", nullable = false)
    private Instant windowEnd;

    // ─────────────────────────────────────────
    // Deployment Frequency
    // ─────────────────────────────────────────
    @Column(name = "deployment_count", nullable = false)
    private Integer deploymentCount = 0;

    @Column(name = "deployment_frequency_daily", precision = 8, scale = 4)
    private BigDecimal deploymentFrequencyDaily;

    @Column(name = "deployment_frequency_tier", columnDefinition = "dora_performer_tier")
    private String deploymentFrequencyTier;

    // ─────────────────────────────────────────
    // Lead Time for Changes
    // ─────────────────────────────────────────
    @Column(name = "lead_time_avg_seconds")
    private Integer leadTimeAvgSeconds;

    @Column(name = "lead_time_p50_seconds")
    private Integer leadTimeP50Seconds;

    @Column(name = "lead_time_p95_seconds")
    private Integer leadTimeP95Seconds;

    @Column(name = "lead_time_tier", columnDefinition = "dora_performer_tier")
    private String leadTimeTier;

    // ─────────────────────────────────────────
    // Change Failure Rate
    // ─────────────────────────────────────────
    @Column(name = "total_deployments", nullable = false)
    private Integer totalDeployments = 0;

    @Column(name = "failed_deployments", nullable = false)
    private Integer failedDeployments = 0;

    @Column(name = "change_failure_rate", precision = 5, scale = 4)
    private BigDecimal changeFailureRate;

    @Column(name = "change_failure_rate_tier", columnDefinition = "dora_performer_tier")
    private String changeFailureRateTier;

    // ─────────────────────────────────────────
    // Mean Time to Recovery
    // ─────────────────────────────────────────
    @Column(name = "incident_count", nullable = false)
    private Integer incidentCount = 0;

    @Column(name = "mttr_avg_seconds")
    private Integer mttrAvgSeconds;

    @Column(name = "mttr_tier", columnDefinition = "dora_performer_tier")
    private String mttrTier;

    // ─────────────────────────────────────────
    // Overall
    // ─────────────────────────────────────────
    @Column(name = "overall_tier", columnDefinition = "dora_performer_tier")
    private String overallTier;

    @Column(name = "computed_at", nullable = false)
    private Instant computedAt = Instant.now();
}