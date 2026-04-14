# FlowMetrics — Architecture

## Overview

FlowMetrics is a distributed event-driven system. Data flows in one direction — from GitHub through a message queue into a database, with two read-only visualization layers on top. No component writes to the database except the processing service, and no component reads from the queue except the processing service.

This separation is intentional. It means each component can be scaled, replaced, or restarted independently without affecting the others.

---

## Component Responsibilities

### Ingestion Service

**Port:** 8080  
**Technology:** Java 21, Spring Boot, Spring AMQP  
**Responsibility:** Receive, validate, and forward webhook events

The ingestion service is the only component exposed to the public internet. Its job is deliberately narrow — it does not process, store, or analyze data. It validates that the request genuinely came from GitHub, filters for relevant event types, and drops the payload onto the message queue.

Key design decisions:
- **Signature verification before deserialization** — the raw body is verified using HMAC-SHA256 against the webhook secret before Jackson ever touches it. This prevents deserialization attacks on untrusted payloads.
- **Constant-time comparison** — `MessageDigest.isEqual` is used instead of `String.equals` to prevent timing attacks where an attacker could guess the signature one character at a time by measuring response time.
- **Event filtering** — only `workflow_run` events with `action=completed` are forwarded. All other events are acknowledged and discarded immediately, keeping the queue clean.

### Message Queue

**Technology:** RabbitMQ 3.13  
**Exchange:** `flowmetrics.exchange` (topic)  
**Queue:** `flowmetrics.workflow-runs`  
**Routing key:** `workflow.run.completed`

The message queue is the backbone of the distributed architecture. It decouples the ingestion and processing services so that:
- A spike in webhook events doesn't overwhelm the processing service
- The processing service can be restarted without losing events
- Both services can be scaled independently

Messages are serialized as JSON using Jackson. The queue is durable — messages survive a RabbitMQ restart.

### Processing Service

**Port:** 8081  
**Technology:** Java 21, Spring Boot, Spring Data JPA, Hibernate  
**Responsibility:** Process events, compute metrics, serve API

The processing service is the core of FlowMetrics. It consumes messages from RabbitMQ and executes a multi-step pipeline for each one:

1. **Upsert repository** — creates a repository record if one doesn't exist for this GitHub repo ID
2. **Upsert commit** — stores the head commit metadata if present
3. **Upsert workflow run** — stores the raw run data
4. **Branch filter** — only runs on the default branch are promoted to deployments. Runs on feature branches are recorded as workflow runs but not treated as deployments.
5. **Create deployment** — maps the workflow run conclusion to a deployment status
6. **Incident detection** — if the deployment failed, opens an incident. If it succeeded, resolves any open incident for the same repository and environment.
7. **DORA snapshot computation** — recomputes all four metrics for all three time windows and writes/updates the snapshot records.

All seven steps execute within a single database transaction per message. If any step fails, the entire message is rolled back and requeued.

### Database

**Technology:** PostgreSQL 16  
**Schema management:** Flyway  
**Connection pool:** HikariCP

The database schema is designed so that the visualization layer never needs to compute anything. All aggregation, tier classification, and metric computation happens in the processing service and is written to `dora_metrics_snapshots`. Dashboards simply read from that table.

`lead_time_seconds` in the `deployments` table and `time_to_recovery_seconds` in the `incidents` table are PostgreSQL generated columns — the database computes them automatically from the relevant timestamps, ensuring they're always consistent.

### React Dashboard

**Port:** 5173 (development)  
**Technology:** React 18, Vite, Recharts, Axios  
**Responsibility:** Live DORA status visualization

The React dashboard is a read-only consumer of the processing service's REST API. It never connects to the database directly. All data fetching goes through:

```
GET /api/metrics/repositories
GET /api/metrics/snapshots/latest?repoId={id}
GET /api/metrics/snapshots?repoId={id}&window={w}
```

The dashboard is designed for engineers who want a real-time view of their delivery pipeline health.

### Power BI Report

**Technology:** Power BI Desktop  
**Data source:** PostgreSQL (direct connection)  
**Responsibility:** Historical analysis and stakeholder reporting

Power BI connects directly to PostgreSQL as a data source, reading from the same `dora_metrics_snapshots` table the React dashboard reads from. It provides a different view of the same data — historical trend analysis, exportable reports, and executive-style scorecards.

The two dashboards serve different audiences and refresh cadences but share the same underlying data, ensuring consistency.

---

## Data Flow

```
1. Developer pushes commit to GitHub
         │
         ▼
2. GitHub Actions workflow runs
         │
         ▼
3. GitHub fires webhook POST to ingestion service
         │
         ├─ Signature invalid → 401 Unauthorized, stop
         ├─ Not workflow_run → 200 OK, ignore
         ├─ Action != completed → 200 OK, ignore
         │
         ▼
4. Ingestion service publishes WorkflowRunPayload to RabbitMQ
         │
         ▼
5. Processing service consumes message
         │
         ├─ Upsert repository record
         ├─ Upsert commit record
         ├─ Upsert workflow run record
         │
         ├─ Branch != default branch → stop (workflow run saved, no deployment)
         │
         ├─ Create deployment record
         │
         ├─ conclusion = failure → open incident
         ├─ conclusion = success → resolve open incident (if any)
         │
         └─ Recompute DORA snapshots for last_7_days, last_30_days, last_90_days
                  │
                  ▼
6. React dashboard polls API → displays updated metrics
7. Power BI refreshes → updated reports
```

---

## Database Schema

```
teams
  └── id, name

repositories
  └── id, team_id → teams.id
      github_repo_id, owner, name, full_name, default_branch

workflow_runs
  └── id, repository_id → repositories.id
      github_run_id, name, head_branch, head_sha
      status, conclusion, run_started_at, run_completed_at
      run_duration_seconds (generated)

commits
  └── id, repository_id → repositories.id
      sha, author, committed_at, message

deployments
  └── id, repository_id → repositories.id
      workflow_run_id → workflow_runs.id
      commit_id → commits.id
      environment, status, deployed_at
      commit_authored_at, lead_time_seconds (generated)

incidents
  └── id, repository_id → repositories.id
      triggering_deployment_id → deployments.id
      resolving_deployment_id → deployments.id
      environment, detected_at, resolved_at
      time_to_recovery_seconds (generated)

dora_metrics_snapshots
  └── id, repository_id → repositories.id
      metric_window, window_start, window_end
      deployment_count, deployment_frequency_daily, deployment_frequency_tier
      lead_time_avg_seconds, lead_time_p50_seconds, lead_time_p95_seconds, lead_time_tier
      total_deployments, failed_deployments, change_failure_rate, change_failure_rate_tier
      incident_count, mttr_avg_seconds, mttr_tier
      overall_tier, computed_at
```

---

## Distributed Systems Properties

**Fault tolerance** — if the processing service goes down, messages accumulate in the RabbitMQ queue and are processed when it comes back up. No data is lost.

**Idempotency** — the processing service uses upsert patterns for repositories, commits, and workflow runs. Reprocessing the same message produces the same result.

**Decoupling** — the ingestion and processing services share no code and communicate only through JSON messages on the queue. Either can be replaced or rewritten without affecting the other.

**Separation of concerns** — ingestion only ingests, processing only processes, dashboards only display. No component crosses these boundaries.

**Schema versioning** — Flyway tracks every database change as a numbered migration. Rolling back or forward is explicit and auditable.