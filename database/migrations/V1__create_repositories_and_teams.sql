-- V1: Repositories and Teams
-- These are the two dimensions all metrics are tracked against.

CREATE TABLE teams (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE repositories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID REFERENCES teams(id) ON DELETE SET NULL,
    github_repo_id  BIGINT NOT NULL UNIQUE,   -- GitHub's internal numeric repo ID
    owner           VARCHAR(100) NOT NULL,     -- GitHub org or user
    name            VARCHAR(100) NOT NULL,     -- repo name
    full_name       VARCHAR(200) NOT NULL,     -- owner/name
    default_branch  VARCHAR(100) NOT NULL DEFAULT 'main',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_repositories_team_id ON repositories(team_id);
CREATE INDEX idx_repositories_full_name ON repositories(full_name);
