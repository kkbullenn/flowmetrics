-- V4: Incidents
-- Auto-detected from failed deployments by the processing service.
-- When a deployment concludes with status = 'failed', the processing service
-- opens an incident linked to that deployment.
-- The incident is resolved when a subsequent successful deployment to the same
-- repository + environment is detected — at that point resolved_at is set and
-- the originating deployment is marked 'rolled_back'.

CREATE TABLE incidents (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id           UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    triggering_deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    resolving_deployment_id  UUID REFERENCES deployments(id) ON DELETE SET NULL,
    environment             VARCHAR(100) NOT NULL DEFAULT 'production',
    detected_at             TIMESTAMPTZ NOT NULL,   -- when the failed deployment completed
    resolved_at             TIMESTAMPTZ,            -- when the follow-up success deployment completed
    time_to_recovery_seconds INT GENERATED ALWAYS AS (
                                CASE
                                    WHEN resolved_at IS NOT NULL
                                    THEN EXTRACT(EPOCH FROM (resolved_at - detected_at))::INT
                                    ELSE NULL
                                END
                            ) STORED,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (triggering_deployment_id)
);

CREATE INDEX idx_incidents_repository_id ON incidents(repository_id);
CREATE INDEX idx_incidents_detected_at   ON incidents(detected_at);
CREATE INDEX idx_incidents_resolved_at   ON incidents(resolved_at);
