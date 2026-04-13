package com.flowmetrics.processing.controller;

import com.flowmetrics.processing.dto.RepositoryDto;
import com.flowmetrics.processing.dto.SnapshotDto;
import com.flowmetrics.processing.entity.DoraMetricsSnapshot;
import com.flowmetrics.processing.repository.DoraMetricsSnapshotRepository;
import com.flowmetrics.processing.repository.RepositoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173") // Allow React dev server
public class MetricsController {

    private final RepositoryRepository repositoryRepository;
    private final DoraMetricsSnapshotRepository snapshotRepository;

    /**
     * Returns all tracked repositories.
     * Used by the dashboard to populate the repository selector.
     */
    @GetMapping("/repositories")
    public List<RepositoryDto> getRepositories() {
        return repositoryRepository.findAll()
                .stream()
                .map(RepositoryDto::from)
                .toList();
    }

    /**
     * Returns all snapshots for a repository filtered by time window.
     * window param: last_7_days | last_30_days | last_90_days
     */
    @Transactional(readOnly = true)
    @GetMapping("/snapshots")
    public ResponseEntity<List<SnapshotDto>> getSnapshots(
            @RequestParam UUID repoId,
            @RequestParam(defaultValue = "last_30_days") String window) {

        List<DoraMetricsSnapshot> snapshots = snapshotRepository
                .findByRepositoryIdAndMetricWindow(repoId, window);

        return ResponseEntity.ok(snapshots.stream()
                .map(SnapshotDto::from)
                .toList());
    }

    /**
     * Returns the single most recent snapshot for each window for a repository.
     * Used by the dashboard scorecard to show current DORA tiers.
     */
    @Transactional(readOnly = true)
    @GetMapping("/snapshots/latest")
    public ResponseEntity<List<SnapshotDto>> getLatestSnapshots(
            @RequestParam UUID repoId) {

        List<String> windows = List.of("last_7_days", "last_30_days", "last_90_days");

        List<SnapshotDto> latest = windows.stream()
                .map(window -> snapshotRepository
                        .findTopByRepositoryIdAndMetricWindowOrderByComputedAtDesc(
                                repoId, window))
                .filter(java.util.Optional::isPresent)
                .map(opt -> SnapshotDto.from(opt.get()))
                .toList();

        return ResponseEntity.ok(latest);
    }
}