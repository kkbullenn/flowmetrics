-- V2: Workflow Runs and Commits
-- Raw data received from GitHub Actions webhooks.
-- This is the ingestion layer's write target — no computed values here.

CREATE TYPE workflow_status AS ENUM (
    'queued',
    'in_progress',
    'completed'
);

CREATE TYPE workflow_conclusion AS ENUM (
    'success',
    'failure',
    'cancelled',
    'skipped',
    'timed_out',
    'action_required',
    'neutral'
);

CREATE TABLE workflow_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id       UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    github_run_id       BIGINT NOT NULL,                -- GitHub's run ID
    github_run_number   INT NOT NULL,
    name                VARCHAR(200) NOT NULL,          -- workflow name
    head_branch         VARCHAR(200) NOT NULL,
    head_sha            VARCHAR(40) NOT NULL,           -- commit SHA that triggered the run
    event               VARCHAR(50) NOT NULL,           -- push, pull_request, workflow_dispatch etc.
    status              workflow_status NOT NULL,
    conclusion          workflow_conclusion,            -- null while run is in progress
    run_started_at      TIMESTAMPTZ NOT NULL,
    run_completed_at    TIMESTAMPTZ,
    run_duration_seconds INT GENERATED ALWAYS AS (
                            EXTRACT(EPOCH FROM (run_completed_at - run_started_at))::INT
                        ) STORED,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (repository_id, github_run_id)
);

CREATE TABLE commits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id   UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha             VARCHAR(40) NOT NULL,
    author          VARCHAR(200),
    committed_at    TIMESTAMPTZ NOT NULL,       -- when the commit was authored
    message         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (repository_id, sha)
);

CREATE INDEX idx_workflow_runs_repository_id  ON workflow_runs(repository_id);
CREATE INDEX idx_workflow_runs_head_sha       ON workflow_runs(head_sha);
CREATE INDEX idx_workflow_runs_started_at     ON workflow_runs(run_started_at);
CREATE INDEX idx_workflow_runs_conclusion     ON workflow_runs(conclusion);
CREATE INDEX idx_commits_repository_id        ON commits(repository_id);
CREATE INDEX idx_commits_sha                  ON commits(sha);
CREATE INDEX idx_commits_committed_at         ON commits(committed_at);
