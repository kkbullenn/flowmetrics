package com.flowmetrics.processing.service;

import com.flowmetrics.processing.entity.DoraMetricsSnapshot;
import com.flowmetrics.processing.entity.Repository;
import com.flowmetrics.processing.repository.DeploymentRepository;
import com.flowmetrics.processing.repository.DoraMetricsSnapshotRepository;
import com.flowmetrics.processing.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DoraMetricsService {

    private final DeploymentRepository deploymentRepository;
    private final IncidentRepository incidentRepository;
    private final DoraMetricsSnapshotRepository snapshotRepository;

    // Window definitions
    private static final String WINDOW_7  = "last_7_days";
    private static final String WINDOW_30 = "last_30_days";
    private static final String WINDOW_90 = "last_90_days";

    // Lead time tier thresholds (in seconds)
    private static final int ONE_HOUR   = 3600;
    private static final int ONE_DAY    = 86400;
    private static final int ONE_WEEK   = 604800;
    private static final int ONE_MONTH  = 2592000;

    // MTTR tier thresholds (in seconds)
    private static final int MTTR_ELITE  = ONE_HOUR;
    private static final int MTTR_HIGH   = ONE_DAY;
    private static final int MTTR_MEDIUM = ONE_WEEK;

    /**
     * Computes and persists snapshots for all three time windows
     * for the given repository. Called after every deployment is saved.
     */
    @Transactional
    public void computeAndSave(Repository repo) {
        Instant now = Instant.now();
        computeWindow(repo, WINDOW_7,  now.minus(7,  ChronoUnit.DAYS), now);
        computeWindow(repo, WINDOW_30, now.minus(30, ChronoUnit.DAYS), now);
        computeWindow(repo, WINDOW_90, now.minus(90, ChronoUnit.DAYS), now);
    }

    private void computeWindow(Repository repo, String windowType,
                               Instant windowStart, Instant windowEnd) {

        // Fetch all deployments in the window
        List<Object[]> deploymentRows = deploymentRepository
                .findDeploymentStatsInWindow(repo.getId(), windowStart, windowEnd);

        int totalDeployments  = 0;
        int failedDeployments = 0;
        long leadTimeSum      = 0;
        int leadTimeCount     = 0;
        java.util.List<Integer> leadTimes = new java.util.ArrayList<>();

        for (Object[] row : deploymentRows) {
            totalDeployments++;
            String status = (String) row[0];
            if ("failed".equals(status) || "rolled_back".equals(status)) {
                failedDeployments++;
            }
            if (row[1] != null) {
                int lt = ((Number) row[1]).intValue();
                leadTimeSum += lt;
                leadTimeCount++;
                leadTimes.add(lt);
            }
        }

        // Successful deployments only for frequency
        int successfulDeployments = totalDeployments - failedDeployments;

        // Deployment frequency — deployments per day
        long windowDays = ChronoUnit.DAYS.between(windowStart, windowEnd);
        if (windowDays == 0) windowDays = 1;
        BigDecimal freqDaily = BigDecimal.valueOf(successfulDeployments)
                .divide(BigDecimal.valueOf(windowDays), 4, RoundingMode.HALF_UP);

        // Lead time stats
        Integer leadTimeAvg = leadTimeCount > 0
                ? (int) (leadTimeSum / leadTimeCount) : null;
        Integer leadTimeP50 = percentile(leadTimes, 50);
        Integer leadTimeP95 = percentile(leadTimes, 95);

        // Change failure rate
        BigDecimal cfr = totalDeployments > 0
                ? BigDecimal.valueOf(failedDeployments)
                  .divide(BigDecimal.valueOf(totalDeployments), 4, RoundingMode.HALF_UP)
                : null;

        // MTTR — average recovery time from resolved incidents in window
        List<Integer> incidentRows = incidentRepository
                .findResolvedIncidentStatsInWindow(repo.getId(), windowStart, windowEnd);

        int incidentCount = incidentRows.size();
        Integer mttrAvg = null;
        if (incidentCount > 0) {
            long mttrSum = 0;
            for (Integer seconds : incidentRows) {
                if (seconds != null) mttrSum += seconds;
            }
            mttrAvg = (int) (mttrSum / incidentCount);
        }

        // Compute tiers
        String dfTier   = deploymentFrequencyTier(freqDaily.doubleValue());
        String ltTier   = leadTimeTier(leadTimeAvg);
        String cfrTier  = changeFailureRateTier(cfr);
        String mttrTier = mttrTier(mttrAvg);
        String overall  = worstTier(dfTier, ltTier, cfrTier, mttrTier);

        // Upsert snapshot
        DoraMetricsSnapshot snapshot = snapshotRepository
                .findByRepositoryIdAndMetricWindowAndWindowStart(
                        repo.getId(), windowType, windowStart)
                .orElse(new DoraMetricsSnapshot());

        snapshot.setRepository(repo);
        snapshot.setMetricWindow(windowType);
        snapshot.setWindowStart(windowStart);
        snapshot.setWindowEnd(windowEnd);
        snapshot.setDeploymentCount(successfulDeployments);
        snapshot.setDeploymentFrequencyDaily(freqDaily);
        snapshot.setDeploymentFrequencyTier(dfTier);
        snapshot.setLeadTimeAvgSeconds(leadTimeAvg);
        snapshot.setLeadTimeP50Seconds(leadTimeP50);
        snapshot.setLeadTimeP95Seconds(leadTimeP95);
        snapshot.setLeadTimeTier(ltTier);
        snapshot.setTotalDeployments(totalDeployments);
        snapshot.setFailedDeployments(failedDeployments);
        snapshot.setChangeFailureRate(cfr);
        snapshot.setChangeFailureRateTier(cfrTier);
        snapshot.setIncidentCount(incidentCount);
        snapshot.setMttrAvgSeconds(mttrAvg);
        snapshot.setMttrTier(mttrTier);
        snapshot.setOverallTier(overall);
        snapshot.setComputedAt(Instant.now());

        snapshotRepository.save(snapshot);

        log.info("Computed DORA snapshot: repo={} window={} df={}/day lt={}s cfr={} mttr={}s overall={}",
                repo.getFullName(), windowType,
                freqDaily, leadTimeAvg, cfr, mttrAvg, overall);
    }

    // ─────────────────────────────────────────
    // Tier classification
    // ─────────────────────────────────────────

    private String deploymentFrequencyTier(double deploymentsPerDay) {
        if (deploymentsPerDay >= 1.0)  return "elite";   // multiple per day or once per day
        if (deploymentsPerDay >= 1.0 / 7)  return "high";    // once per week
        if (deploymentsPerDay >= 1.0 / 30) return "medium";  // once per month
        return "low";
    }

    private String leadTimeTier(Integer avgSeconds) {
        if (avgSeconds == null) return "low";
        if (avgSeconds <= ONE_HOUR) return "elite";
        if (avgSeconds <= ONE_DAY)  return "high";
        if (avgSeconds <= ONE_WEEK) return "medium";
        return "low";
    }

    private String changeFailureRateTier(BigDecimal cfr) {
        if (cfr == null) return "elite";  // no deployments = no failures
        double rate = cfr.doubleValue();
        if (rate <= 0.05) return "elite";
        if (rate <= 0.10) return "high";
        if (rate <= 0.15) return "medium";
        return "low";
    }

    private String mttrTier(Integer avgSeconds) {
        if (avgSeconds == null) return "elite";  // no incidents = elite recovery
        if (avgSeconds <= MTTR_ELITE)  return "elite";
        if (avgSeconds <= MTTR_HIGH)   return "high";
        if (avgSeconds <= MTTR_MEDIUM) return "medium";
        return "low";
    }

    private String worstTier(String... tiers) {
        // Tier priority: low > medium > high > elite
        for (String t : tiers) if ("low".equals(t))    return "low";
        for (String t : tiers) if ("medium".equals(t)) return "medium";
        for (String t : tiers) if ("high".equals(t))   return "high";
        return "elite";
    }

    // ─────────────────────────────────────────
    // Percentile helper
    // ─────────────────────────────────────────

    private Integer percentile(java.util.List<Integer> values, int percentile) {
        if (values == null || values.isEmpty()) return null;
        java.util.List<Integer> sorted = new java.util.ArrayList<>(values);
        java.util.Collections.sort(sorted);
        int index = (int) Math.ceil(percentile / 100.0 * sorted.size()) - 1;
        return sorted.get(Math.max(0, index));
    }
}