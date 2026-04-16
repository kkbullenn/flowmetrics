# FlowMetrics

A distributed DORA metrics platform that automatically ingests GitHub Actions pipeline data, computes software delivery performance metrics, and surfaces them through two complementary dashboards.

---

## What It Does

FlowMetrics watches your GitHub repositories by receiving webhook events every time a GitHub Actions workflow run completes. It processes those events through a distributed pipeline, computes the four DORA (DevOps Research and Assessment) metrics, and presents them through a live React dashboard and a Power BI report.

The four DORA metrics it tracks:

| Metric | What it measures |
|---|---|
| **Deployment Frequency** | How often you successfully deploy to production |
| **Lead Time for Changes** | Time from commit authored to deployed in production |
| **Change Failure Rate** | Percentage of deployments that cause an incident |
| **Mean Time to Recovery** | How long it takes to recover from a failed deployment |

Each metric is classified into a performance tier — Elite, High, Medium, or Low — based on the official DORA research benchmarks.
<img width="2560" height="1288" alt="image" src="https://github.com/user-attachments/assets/fa0e59ce-9199-40b9-b68d-c905fc4d9822" />

---

## Architecture

FlowMetrics is composed of four loosely coupled layers that communicate through a message queue:

```
GitHub Actions
      │
      │  webhook (HTTP POST)
      ▼
┌─────────────────┐
│ Ingestion       │  Spring Boot · port 8080
│ Service         │  Validates HMAC-SHA256 signature
│                 │  Filters completed workflow_run events
└────────┬────────┘
         │  publishes WorkflowRunPayload
         ▼
┌─────────────────┐
│   RabbitMQ      │  flowmetrics.exchange
│   Message Queue │  flowmetrics.workflow-runs queue
└────────┬────────┘
         │  consumes
         ▼
┌─────────────────┐
│ Processing      │  Spring Boot · port 8081
│ Service         │  Upserts repositories, commits, workflow runs
│                 │  Creates deployments (main branch only)
│                 │  Auto-detects incidents from failed deployments
│                 │  Auto-resolves incidents on next success
│                 │  Computes DORA snapshots (7d / 30d / 90d)
│                 │  Serves REST API for dashboard
└────────┬────────┘
         │  writes / reads
         ▼
┌─────────────────┐
│   PostgreSQL    │  Schema managed by Flyway
│   Database      │  repositories, workflow_runs, commits,
│                 │  deployments, incidents, dora_metrics_snapshots
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
React      Power BI
Dashboard  Report
(port 5173) (Desktop)
```

**Security note:** the ingestion service accepts the raw webhook body as bytes and verifies the HMAC-SHA256 signature before deserializing — this is intentional. Deserializing an untrusted payload before verifying it is a security risk.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Ingestion service | Java 21, Spring Boot 3.4, Spring AMQP |
| Processing service | Java 21, Spring Boot 3.4, Spring Data JPA, Hibernate |
| Message queue | RabbitMQ 3.13 |
| Database | PostgreSQL 16, Flyway migrations |
| React dashboard | React 18, Vite, Recharts, Axios |
| BI report | Power BI Desktop |
| Infrastructure | Docker, Docker Compose |

---

## Project Structure

```
flowmetrics/
├── ingestion-service/          # Spring Boot — receives GitHub webhooks
│   └── src/main/java/com/flowmetrics/ingestion/
│       ├── controller/         # WebhookController — POST /api/webhooks/github
│       ├── security/           # WebhookSignatureVerifier — HMAC-SHA256
│       ├── service/            # WebhookPublisher — RabbitMQ publisher
│       ├── dto/                # WorkflowRunPayload — GitHub webhook DTO
│       └── config/             # RabbitMQConfig — exchange, queue, binding
│
├── processing-service/         # Spring Boot — consumes queue, computes metrics
│   └── src/main/java/com/flowmetrics/processing/
│       ├── consumer/           # WorkflowRunConsumer — RabbitMQ listener
│       ├── service/            # WorkflowRunProcessingService, DoraMetricsService
│       ├── entity/             # JPA entities — Repository, WorkflowRun, Deployment, etc.
│       ├── repository/         # Spring Data repositories
│       ├── controller/         # MetricsController — REST API for dashboard
│       └── dto/                # SnapshotDto, RepositoryDto — API response shapes
│
├── dashboard-ui/               # React + Vite — live DORA dashboard
│   └── src/
│       ├── api/                # metrics.js — axios client
│       ├── components/         # MetricCard, TierBadge, CfrDonut, TrendChart, PerformanceRing
│       └── pages/              # Dashboard.jsx — main page
│
├── database/
│   └── migrations/             # Flyway SQL migrations V1–V7
│
├── docs/
│   ├── architecture.md
│   └── dora-methodology.md
│
└── docker-compose.yml          # PostgreSQL + RabbitMQ + Flyway
```

---

## Getting Started

### Prerequisites

- Docker Desktop
- Java 21
- Node.js 18+
- IntelliJ IDEA (recommended)
- ngrok (for local webhook development)

### 1. Start the infrastructure

```bash
docker compose up
```

This starts PostgreSQL, RabbitMQ, and runs all Flyway migrations automatically. Verify at:
- RabbitMQ management UI: http://localhost:15672 (flowmetrics / flowmetrics_dev)
- PostgreSQL: localhost:5433 (flowmetrics / flowmetrics_dev)

### 2. Configure the webhook secret

Generate a secret:
```bash
docker exec -it flowmetrics-postgres openssl rand -hex 32
```

Set it in `ingestion-service/src/main/resources/application.properties`:
```properties
flowmetrics.github.webhook-secret=your_generated_secret_here
```

### 3. Expose localhost to GitHub

```bash
ngrok http 8080
```

Copy the forwarding URL — you'll need it for the GitHub webhook.

### 4. Register the webhook on GitHub

In your repository: Settings → Webhooks → Add webhook

| Field | Value |
|---|---|
| Payload URL | `https://your-ngrok-url/api/webhooks/github` |
| Content type | `application/json` |
| Secret | your generated secret |
| Events | Workflow runs only |

### 5. Run the services

In IntelliJ, run both:
- `IngestionServiceApplication` (port 8080)
- `ProcessingServiceApplication` (port 8081)

### 6. Run the React dashboard

```bash
cd dashboard-ui
npm install
npm run dev
```

Open http://localhost:5173

### 7. Trigger data collection

Push a commit to the main branch of your watched repository. GitHub Actions will run, fire a webhook, and within seconds you'll see metrics appear in the dashboard.

---

## REST API

The processing service exposes these endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/metrics/repositories` | All tracked repositories |
| GET | `/api/metrics/snapshots/latest?repoId={id}` | Latest snapshot per window for a repo |
| GET | `/api/metrics/snapshots?repoId={id}&window={w}` | All snapshots for a repo + window |

Window values: `last_7_days`, `last_30_days`, `last_90_days`

---

## Database Schema

| Table | Purpose |
|---|---|
| `repositories` | GitHub repos being tracked |
| `workflow_runs` | Raw GitHub Actions run data |
| `commits` | Commit metadata for lead time calculation |
| `deployments` | Promoted from workflow runs on the default branch |
| `incidents` | Auto-detected from failed deployments |
| `dora_metrics_snapshots` | Pre-computed DORA metrics — what dashboards read from |
| `teams` | Team grouping (future use) |

---

## DORA Tier Benchmarks

| Metric | Elite | High | Medium | Low |
|---|---|---|---|---|
| Deployment Frequency | Multiple/day | Once/day–week | Once/week–month | < Once/month |
| Lead Time | < 1 hour | 1 day – 1 week | 1 week – 1 month | > 1 month |
| Change Failure Rate | 0 – 5% | 5 – 10% | 10 – 15% | > 15% |
| MTTR | < 1 hour | < 1 day | < 1 week | > 1 week |

The overall tier is always the worst of the four individual tiers.

---

## Dashboards

### React Dashboard (live)
Real-time view of current DORA performance. Intended for engineers who want to see the current state of their delivery pipeline at a glance.

- Metric cards with tier classification
- Performance ring showing overall score
- CFR donut chart — deployment success vs failure breakdown
- Switchable trend lines for all four metrics
- DORA tier reference table

### Power BI Report (analytical)
Historical analysis and reporting. Intended for engineering managers and stakeholders who need exportable reports and trend analysis over longer time horizons.

- Scorecard page — current tier cards, deployment outcomes donut
- Trends page — four line charts showing metric movement over time
- Deployments page — deployment history table, status bar chart, incident log

<img width="2031" height="1134" alt="image" src="https://github.com/user-attachments/assets/9801cbea-21d2-4e5c-a788-dd943652aebe" />


Both dashboards read from the same `dora_metrics_snapshots` table in PostgreSQL, keeping the visualization layer simple and decoupled from computation logic.

---

## How Incidents Are Tracked

FlowMetrics uses a simple but effective auto-detection model:

1. When a deployment to the default branch **fails**, an incident is automatically opened with `detected_at` set to the deployment completion time
2. When the **next successful** deployment to the same repository and environment comes in, the open incident is automatically resolved with `resolved_at` set to that deployment's completion time
3. `time_to_recovery_seconds` is a generated column — PostgreSQL computes it automatically from the two timestamps

This means no manual incident management is required — the system infers incidents directly from deployment outcomes.

---

##  License

This project currently has no specified license, you can use it however you'd like :).

---

## 👨‍💻 Author

Developed end to end completely by Bullen Kosa.
