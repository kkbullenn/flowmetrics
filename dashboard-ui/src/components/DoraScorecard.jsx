import MetricCard from './MetricCard';
import TierBadge from './TierBadge';

function formatLeadTime(seconds) {
    if (seconds == null) return null;
    if (seconds < 3600) return { value: Math.round(seconds / 60), unit: 'min' };
    if (seconds < 86400) return { value: (seconds / 3600).toFixed(1), unit: 'hrs' };
    return { value: (seconds / 86400).toFixed(1), unit: 'days' };
}

function formatMttr(seconds) {
    if (seconds == null) return null;
    if (seconds < 3600) return { value: Math.round(seconds / 60), unit: 'min' };
    if (seconds < 86400) return { value: (seconds / 3600).toFixed(1), unit: 'hrs' };
    return { value: (seconds / 86400).toFixed(1), unit: 'days' };
}

export default function DoraScorecard({ snapshot }) {
    if (!snapshot) return null;

    const lt = formatLeadTime(snapshot.leadTimeAvgSeconds);
    const mttr = formatMttr(snapshot.mttrAvgSeconds);
    const cfrPercent = snapshot.changeFailureRate != null
        ? (snapshot.changeFailureRate * 100).toFixed(1)
        : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                background: '#f9fafb',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
            }}>
                <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                    Overall Performance
                </span>
                <TierBadge tier={snapshot.overallTier} />
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>
                    {snapshot.totalDeployments} deployments · {snapshot.incidentCount} incidents
                </span>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <MetricCard
                    title="Deployment Frequency"
                    value={snapshot.deploymentFrequencyDaily?.toFixed(2)}
                    unit="/ day"
                    tier={snapshot.deploymentFrequencyTier}
                    subtitle={`${snapshot.deploymentCount} successful deployments`}
                />
                <MetricCard
                    title="Lead Time for Changes"
                    value={lt?.value}
                    unit={lt?.unit}
                    tier={snapshot.leadTimeTier}
                    subtitle={`p50: ${formatLeadTime(snapshot.leadTimeP50Seconds)?.value}${formatLeadTime(snapshot.leadTimeP50Seconds)?.unit ?? ''} · p95: ${formatLeadTime(snapshot.leadTimeP95Seconds)?.value}${formatLeadTime(snapshot.leadTimeP95Seconds)?.unit ?? ''}`}
                />
                <MetricCard
                    title="Change Failure Rate"
                    value={cfrPercent}
                    unit="%"
                    tier={snapshot.changeFailureRateTier}
                    subtitle={`${snapshot.failedDeployments} of ${snapshot.totalDeployments} deployments failed`}
                />
                <MetricCard
                    title="Mean Time to Recovery"
                    value={mttr?.value}
                    unit={mttr?.unit}
                    tier={snapshot.mttrTier}
                    subtitle={mttr ? `avg recovery time` : 'No incidents resolved'}
                />
            </div>
        </div>
    );
}