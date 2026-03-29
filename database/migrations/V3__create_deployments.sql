-- V3: Deployments
-- A deployment is a workflow run that targeted a production-like environment.
-- The processing service creates a deployment record when it detects a workflow
-- run on the default branch that concluded successfully (or failed — we track both).

CREATE TYPE deployment_status AS ENUM (
    'success',
    'failed',
    'rolled_back'       -- auto-detected when a follow-up deployment reverting this one succeeds
);

CREATE TABLE deployments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id       UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    workflow_run_id     UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    commit_id           UUID REFERENCES commits(id) ON DELETE SET NULL,
    environment         VARCHAR(100) NOT NULL DEFAULT 'production',
    status              deployment_status NOT NULL,
    deployed_at         TIMESTAMPTZ NOT NULL,       -- when the workflow completed
    commit_authored_at  TIMESTAMPTZ,                -- copied from commit for fast lead time queries
    lead_time_seconds   INT GENERATED ALWAYS AS (
                            CASE
                                WHEN commit_authored_at IS NOT NULL
                                THEN EXTRACT(EPOCH FROM (deployed_at - commit_authored_at))::INT
                                ELSE NULL
                            END
                        ) STORED,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workflow_run_id)
);

CREATE INDEX idx_deployments_repository_id  ON deployments(repository_id);
CREATE INDEX idx_deployments_deployed_at    ON deployments(deployed_at);
CREATE INDEX idx_deployments_status         ON deployments(status);
CREATE INDEX idx_deployments_environment    ON deployments(environment);
