-- V6: Convert PostgreSQL custom enum columns to VARCHAR
-- Hibernate maps Java String fields to VARCHAR over JDBC. PostgreSQL has no
-- implicit cast from varchar to a custom enum type, which caused type mismatch
-- errors on insert. Switching to VARCHAR keeps the data unchanged and lets
-- Hibernate write without a cast. Value constraints are enforced at the
-- application layer.

ALTER TABLE workflow_runs
    ALTER COLUMN status     TYPE VARCHAR(50) USING status::VARCHAR,
    ALTER COLUMN conclusion TYPE VARCHAR(50) USING conclusion::VARCHAR;

ALTER TABLE deployments
    ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR;

DROP TYPE workflow_status;
DROP TYPE workflow_conclusion;
DROP TYPE deployment_status;
