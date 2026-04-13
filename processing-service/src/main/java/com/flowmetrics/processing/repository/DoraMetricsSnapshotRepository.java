package com.flowmetrics.processing.repository;

import com.flowmetrics.processing.entity.DoraMetricsSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoraMetricsSnapshotRepository extends JpaRepository<DoraMetricsSnapshot, UUID> {

    @Query(value = """
            SELECT * FROM dora_metrics_snapshots
            WHERE repository_id = :repoId
              AND metric_window = :window
              AND window_start = :windowStart
            LIMIT 1
            """, nativeQuery = true)
    Optional<DoraMetricsSnapshot> findByRepositoryIdAndMetricWindowAndWindowStart(
            @Param("repoId") UUID repoId,
            @Param("window") String window,
            @Param("windowStart") Instant windowStart);

    // All snapshots for a repo + window (for trend charts)
    List<DoraMetricsSnapshot> findByRepositoryIdAndMetricWindowOrderByComputedAtDesc(
            UUID repositoryId, String metricWindow);

    // Alias used by the snapshots endpoint
    default List<DoraMetricsSnapshot> findByRepositoryIdAndMetricWindow(
            UUID repositoryId, String metricWindow) {
        return findByRepositoryIdAndMetricWindowOrderByComputedAtDesc(repositoryId, metricWindow);
    }

    // Most recent snapshot for a repo + window (for scorecard)
    Optional<DoraMetricsSnapshot> findTopByRepositoryIdAndMetricWindowOrderByComputedAtDesc(
            UUID repositoryId, String metricWindow);
}