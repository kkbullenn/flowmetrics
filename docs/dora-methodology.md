# DORA Methodology

## What is DORA?

DORA — DevOps Research and Assessment — is a research program that has been studying software delivery performance since 2014. Their annual State of DevOps report is the largest and longest-running study of its kind, with data from tens of thousands of engineers and organizations worldwide.

The core finding of the research is that software delivery performance is measurable, and that high-performing teams consistently outperform low-performing teams on both speed and stability — disproving the common assumption that you have to trade one for the other.

DORA identified four key metrics that together capture the full picture of software delivery performance.

---

## The Four Metrics

### Deployment Frequency

**What it measures:** How often an organization successfully releases to production.

**Why it matters:** Deployment frequency is a proxy for batch size. Teams that deploy frequently do so because they've learned to keep changes small. Small changes are easier to review, easier to test, easier to roll back, and less likely to cause incidents. High deployment frequency is both a cause and an effect of good engineering practices.

**How FlowMetrics computes it:**
- Counts successful deployments to the default branch within the time window
- Divides by the number of days in the window to get a daily rate
- A deployment is defined as a GitHub Actions workflow run on the default branch that concluded with `success`

**Tier thresholds:**

| Tier | Threshold |
|---|---|
| Elite | Multiple deployments per day (≥ 1.0/day) |
| High | Between once per day and once per week (≥ 1/7 per day) |
| Medium | Between once per week and once per month (≥ 1/30 per day) |
| Low | Less than once per month (< 1/30 per day) |

---

### Lead Time for Changes

**What it measures:** The time it takes for a committed code change to reach production.

**Why it matters:** Lead time captures the efficiency of the entire delivery pipeline — from the moment a developer commits code to the moment that code is running in production. Long lead times indicate bottlenecks in review, testing, or deployment processes. Short lead times mean fast feedback and the ability to respond quickly to user needs or production issues.

**How FlowMetrics computes it:**
- For each deployment, lead time is calculated as: `deployed_at - commit_authored_at`
- The commit timestamp comes from the `head_commit.timestamp` field in the GitHub webhook payload, which is when the commit was originally authored
- Average, median (p50), and 95th percentile (p95) are computed across all deployments in the window
- `lead_time_seconds` is a PostgreSQL generated column — computed automatically and always consistent

**Tier thresholds:**

| Tier | Threshold |
|---|---|
| Elite | Less than one hour |
| High | Between one day and one week |
| Medium | Between one week and one month |
| Low | More than one month |

---

### Change Failure Rate

**What it measures:** The percentage of deployments that result in a production failure requiring remediation.

**Why it matters:** Change failure rate measures deployment quality. A high rate means the team is frequently shipping broken changes — this creates toil, erodes user trust, and forces engineers into reactive firefighting mode instead of building new features. A low rate indicates a mature testing and review process.

**How FlowMetrics computes it:**

```
CFR = failed_deployments / total_deployments
```

A deployment is classified as failed when the GitHub Actions workflow concludes with `failure`, `timed_out`, or `action_required`. A failed deployment automatically triggers incident creation.

**Tier thresholds:**

| Tier | Threshold |
|---|---|
| Elite | 0 – 5% |
| High | 5 – 10% |
| Medium | 10 – 15% |
| Low | Greater than 15% |

---

### Mean Time to Recovery

**What it measures:** How quickly a team can restore service after a production failure.

**Why it matters:** No system is perfectly reliable. MTTR measures resilience — how prepared the team is to detect, respond to, and resolve production incidents. A low MTTR indicates good observability, clear on-call processes, and a culture that treats incident resolution as a first-class priority.

**How FlowMetrics computes it:**
- An incident is automatically opened when a failed deployment is detected, with `detected_at` set to the deployment completion time
- The incident is automatically resolved when the next successful deployment to the same repository and environment comes in, with `resolved_at` set to that deployment's completion time
- MTTR is the average `time_to_recovery_seconds` across all resolved incidents in the window
- `time_to_recovery_seconds` is a PostgreSQL generated column: `EXTRACT(EPOCH FROM (resolved_at - detected_at))`

**Tier thresholds:**

| Tier | Threshold |
|---|---|
| Elite | Less than one hour |
| High | Less than one day |
| Medium | Less than one week |
| Low | More than one week |

---

## Overall Tier

The overall tier is always the **worst** of the four individual tiers. This is consistent with the DORA methodology — a team cannot be considered high-performing if any one dimension of their delivery process is failing.

For example, a team with Elite deployment frequency, Elite lead time, Elite MTTR, but Low change failure rate has an overall tier of Low. The change failure rate is dragging down what would otherwise be an excellent delivery process.

---

## Time Windows

FlowMetrics computes snapshots across three rolling time windows:

| Window | Use case |
|---|---|
| Last 7 days | Current sprint performance, immediate feedback |
| Last 30 days | Monthly review, trend detection |
| Last 90 days | Quarterly planning, long-term improvement tracking |

Snapshots are recomputed every time a new deployment event is processed, ensuring the data is always fresh without requiring a scheduled job.

---

## Limitations and Caveats

**Lead time approximation** — FlowMetrics measures lead time from commit authored to deployed. This is a reasonable approximation but doesn't capture the full cycle time from when work was started (e.g. when a ticket was picked up) to when it was deployed. A more complete measurement would require integration with a project management tool.

**Deployment definition** — FlowMetrics defines a deployment as any GitHub Actions workflow run that completes on the default branch. This works well for repositories where the main branch CI pipeline represents production deployments, but may not be accurate for repositories with more complex deployment workflows (e.g. separate deployment pipelines triggered by tags or releases).

**Incident definition** — incidents are inferred from deployment failures. This means a deployment that fails for infrastructure reasons unrelated to the code change (e.g. a flaky test environment) will still be counted as an incident. Manual incident override is not currently supported.

**Data volume** — DORA metrics are most meaningful with sufficient data volume. A team with only a few deployments per month will have high statistical variance in their metrics. The 90-day window is recommended for teams with low deployment frequency.

---

## Further Reading

- [DORA State of DevOps Report](https://dora.dev) — the original research
- [Accelerate by Nicole Forsgren, Jez Humble, Gene Kim](https://itrevolution.com/product/accelerate/) — the book that formalized the four metrics
- [Google Cloud DORA](https://cloud.google.com/blog/products/devops-sre/using-the-four-keys-to-measure-your-devops-performance) — Google's Four Keys implementation