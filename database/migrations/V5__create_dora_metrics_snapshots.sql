-- V5: DORA Metrics Snapshots
-- The processing service computes and writes a snapshot of all four DORA metrics
-- on a rolling basis (e.g. every time a deployment event is processed).
-- Snapshots are scoped to a time window, a repository, and optionally a team.
-- Power BI and the React dashboard read from this table — they never compute metrics
-- themselves. This keeps the visualization layer simple and fast.

CREATE TYPE dora_performer_tier AS ENUM (
    'elite',    -- best in class
    'high',
    'medium',
    'low'
);

CREATE TYPE metric_window_type AS ENUM (
    'last_7_days',
    'last_30_days',
    'last_90_days'
);

CREATE TABLE dora_metrics_snapshots (
                                        id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scope: one or both of these will be set
                                        repository_id               UUID REFERENCES repositories(id) ON DELETE CASCADE,
                                        team_id                     UUID REFERENCES teams(id) ON DELETE CASCADE,

                                        metric_window               metric_window_type NOT NULL,
                                        window_start                TIMESTAMPTZ NOT NULL,
                                        window_end                  TIMESTAMPTZ NOT NULL,

    -- Deployment Frequency
    -- Total successful deployments to production within the window
                                        deployment_count            INT NOT NULL DEFAULT 0,
    -- Deployments per day (deployment_count / window days)
                                        deployment_frequency_daily  NUMERIC(8, 4),
                                        deployment_frequency_tier   dora_performer_tier,

    -- Lead Time for Changes
    -- Average seconds from commit authored to deployed across all deployments in window
                                        lead_time_avg_seconds       INT,
                                        lead_time_p50_seconds       INT,    -- median
                                        lead_time_p95_seconds       INT,    -- tail latency
                                        lead_time_tier              dora_performer_tier,

    -- Change Failure Rate
    -- failed_deployments / total_deployments within the window
                                        total_deployments           INT NOT NULL DEFAULT 0,
                                        failed_deployments          INT NOT NULL DEFAULT 0,
                                        change_failure_rate         NUMERIC(5, 4),   -- 0.0000 to 1.0000 (e.g. 0.15 = 15%)
                                        change_failure_rate_tier    dora_performer_tier,

    -- Mean Time to Recovery
    -- Average time_to_recovery_seconds across resolved incidents in the window
                                        incident_count              INT NOT NULL DEFAULT 0,
                                        mttr_avg_seconds            INT,
                                        mttr_tier                   dora_performer_tier,

    -- Overall tier is the worst of the four individual tiers
                                        overall_tier                dora_performer_tier,

                                        computed_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Only one snapshot per scope + window combination at a time
                                        CONSTRAINT chk_scope CHECK (repository_id IS NOT NULL OR team_id IS NOT NULL),
                                        UNIQUE NULLS NOT DISTINCT (repository_id, team_id, metric_window, window_start)
);

CREATE INDEX idx_dora_snapshots_repository_id ON dora_metrics_snapshots(repository_id);
CREATE INDEX idx_dora_snapshots_team_id       ON dora_metrics_snapshots(team_id);
CREATE INDEX idx_dora_snapshots_window_end    ON dora_metrics_snapshots(window_end);
CREATE INDEX idx_dora_snapshots_computed_at   ON dora_metrics_snapshots(computed_at);