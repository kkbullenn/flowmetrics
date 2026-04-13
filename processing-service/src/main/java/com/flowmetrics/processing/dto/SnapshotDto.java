package com.flowmetrics.processing.dto;

import com.flowmetrics.processing.entity.DoraMetricsSnapshot;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
public class SnapshotDto {

    private UUID id;
    private String repositoryFullName;
    private String metricWindow;
    private Instant windowStart;
    private Instant windowEnd;
    private Instant computedAt;

    // Deployment Frequency
    private Integer deploymentCount;
    private BigDecimal deploymentFrequencyDaily;
    private String deploymentFrequencyTier;

    // Lead Time
    private Integer leadTimeAvgSeconds;
    private Integer leadTimeP50Seconds;
    private Integer leadTimeP95Seconds;
    private String leadTimeTier;

    // Change Failure Rate
    private Integer totalDeployments;
    private Integer failedDeployments;
    private BigDecimal changeFailureRate;
    private String changeFailureRateTier;

    // MTTR
    private Integer incidentCount;
    private Integer mttrAvgSeconds;
    private String mttrTier;

    // Overall
    private String overallTier;

    public static SnapshotDto from(DoraMetricsSnapshot s) {
        SnapshotDto dto = new SnapshotDto();
        dto.setId(s.getId());
        dto.setRepositoryFullName(
                s.getRepository() != null ? s.getRepository().getFullName() : null);
        dto.setMetricWindow(s.getMetricWindow());
        dto.setWindowStart(s.getWindowStart());
        dto.setWindowEnd(s.getWindowEnd());
        dto.setComputedAt(s.getComputedAt());

        dto.setDeploymentCount(s.getDeploymentCount());
        dto.setDeploymentFrequencyDaily(s.getDeploymentFrequencyDaily());
        dto.setDeploymentFrequencyTier(s.getDeploymentFrequencyTier());

        dto.setLeadTimeAvgSeconds(s.getLeadTimeAvgSeconds());
        dto.setLeadTimeP50Seconds(s.getLeadTimeP50Seconds());
        dto.setLeadTimeP95Seconds(s.getLeadTimeP95Seconds());
        dto.setLeadTimeTier(s.getLeadTimeTier());

        dto.setTotalDeployments(s.getTotalDeployments());
        dto.setFailedDeployments(s.getFailedDeployments());
        dto.setChangeFailureRate(s.getChangeFailureRate());
        dto.setChangeFailureRateTier(s.getChangeFailureRateTier());

        dto.setIncidentCount(s.getIncidentCount());
        dto.setMttrAvgSeconds(s.getMttrAvgSeconds());
        dto.setMttrTier(s.getMttrTier());

        dto.setOverallTier(s.getOverallTier());
        return dto;
    }
}