-- V7: Convert dora_metrics_snapshots enum columns to VARCHAR
-- Same root cause as V6: Hibernate maps Java String fields to VARCHAR over JDBC,
-- but PostgreSQL has no implicit cast from varchar to a custom enum type.
-- Switching to VARCHAR keeps all existing data and lets Hibernate write without errors.

ALTER TABLE dora_metrics_snapshots
    ALTER COLUMN metric_window               TYPE VARCHAR(50)  USING metric_window::VARCHAR,
    ALTER COLUMN deployment_frequency_tier   TYPE VARCHAR(20)  USING deployment_frequency_tier::VARCHAR,
    ALTER COLUMN lead_time_tier              TYPE VARCHAR(20)  USING lead_time_tier::VARCHAR,
    ALTER COLUMN change_failure_rate_tier    TYPE VARCHAR(20)  USING change_failure_rate_tier::VARCHAR,
    ALTER COLUMN mttr_tier                   TYPE VARCHAR(20)  USING mttr_tier::VARCHAR,
    ALTER COLUMN overall_tier                TYPE VARCHAR(20)  USING overall_tier::VARCHAR;

DROP TYPE dora_performer_tier;
DROP TYPE metric_window_type;
