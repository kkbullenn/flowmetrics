import { useEffect, useState } from 'react';
import { getRepositories, getLatestSnapshots } from '../api/metrics';
import MetricCard from '../components/MetricCard';
import CfrDonut from '../components/CfrDonut';
import TrendChart from '../components/TrendChart';
import PerformanceRing from '../components/PerformanceRing';
import TierBadge from '../components/TierBadge';

const WINDOWS = [
    { key: 'last_7_days',  label: '7D'  },
    { key: 'last_30_days', label: '30D' },
    { key: 'last_90_days', label: '90D' },
];

function formatLeadTime(s) {
    if (s == null) return { value: '—', unit: '' };
    if (s < 3600)  return { value: Math.round(s / 60),        unit: 'min'  };
    if (s < 86400) return { value: (s / 3600).toFixed(1),     unit: 'hrs'  };
    return             { value: (s / 86400).toFixed(1),    unit: 'days' };
}

function formatMttr(s) { return formatLeadTime(s); }

export default function Dashboard() {
    const [repos, setRepos]           = useState([]);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [snapshots, setSnapshots]   = useState([]);
    const [activeWindow, setActiveWindow] = useState('last_7_days');
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState(null);

    useEffect(() => {
        getRepositories()
            .then(data => { setRepos(data); if (data.length > 0) setSelectedRepo(data[0]); })
            .catch(() => setError('Failed to load repositories'));
    }, []);

    useEffect(() => {
        if (!selectedRepo) return;
        setLoading(true);
        getLatestSnapshots(selectedRepo.id)
            .then(data => { setSnapshots(data); setLoading(false); })
            .catch(() => { setError('Failed to load metrics'); setLoading(false); });
    }, [selectedRepo]);

    const snap = snapshots.find(s => s.metricWindow === activeWindow);
    const lt   = formatLeadTime(snap?.leadTimeAvgSeconds);
    const mttr = formatMttr(snap?.mttrAvgSeconds);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

            {/* Top nav */}
            <header style={{
                borderBottom: '1px solid var(--border)',
                padding: '0 28px',
                display: 'flex', alignItems: 'center', height: '52px', gap: '16px',
                background: 'var(--bg2)',
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Logo mark */}
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="0" y="10" width="4" height="10" rx="1" fill="var(--high)" />
                        <rect x="5" y="6"  width="4" height="14" rx="1" fill="var(--elite)" />
                        <rect x="10" y="2" width="4" height="18" rx="1" fill="var(--accent)" />
                        <rect x="15" y="8" width="4" height="12" rx="1" fill="var(--medium)" />
                    </svg>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '15px', color: 'var(--text)', letterSpacing: '-0.01em' }}>
            flowmetrics
          </span>
                </div>

                <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />

                <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
          dora dashboard
        </span>

                {/* Window pills */}
                <div style={{ display: 'flex', gap: '4px', marginLeft: '16px' }}>
                    {WINDOWS.map(w => (
                        <button key={w.key} onClick={() => setActiveWindow(w.key)} style={{
                            padding: '4px 12px', borderRadius: '4px', fontSize: '11px',
                            fontFamily: 'var(--mono)', cursor: 'pointer', transition: 'all 0.15s',
                            border: `1px solid ${activeWindow === w.key ? 'var(--accent)' : 'var(--border)'}`,
                            background: activeWindow === w.key ? 'rgba(59,130,246,0.15)' : 'transparent',
                            color: activeWindow === w.key ? 'var(--accent2)' : 'var(--muted)',
                        }}>{w.label}</button>
                    ))}
                </div>

                {/* Repo selector */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>repo</span>
                    <select value={selectedRepo?.id ?? ''} onChange={e => setSelectedRepo(repos.find(r => r.id === e.target.value))}
                            style={{
                                padding: '5px 10px', borderRadius: '5px',
                                border: '1px solid var(--border)', fontSize: '12px',
                                color: 'var(--text)', background: 'var(--bg3)', cursor: 'pointer',
                                fontFamily: 'var(--mono)',
                            }}>
                        {repos.map(r => <option key={r.id} value={r.id}>{r.fullName}</option>)}
                    </select>
                </div>
            </header>

            {/* Content */}
            <main style={{ flex: 1, padding: '24px 28px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>

                {error && (
                    <div style={{ padding: '10px 14px', background: 'var(--low-bg)', color: 'var(--low)', borderRadius: '6px', marginBottom: '20px', fontFamily: 'var(--mono)', fontSize: '12px', border: '1px solid var(--low)30' }}>
                        ⚠ {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px' }}>
                        <span>loading metrics...</span>
                    </div>
                ) : !snap ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>⌀</span>
                        <span>no data for this window — push commits to generate metrics</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Row 1: status bar */}
                        <div className="fade-up" style={{
                            display: 'flex', alignItems: 'center', gap: '16px',
                            padding: '12px 16px',
                            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px',
                        }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {selectedRepo?.fullName}
              </span>
                            <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
                            <TierBadge tier={snap.overallTier} size="lg" />
                            <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
                            <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                {snap.totalDeployments} deployments
              </span>
                            <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                · {snap.incidentCount} incidents
              </span>
                            <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                computed {new Date(snap.computedAt * 1000).toLocaleString()}
              </span>
                        </div>

                        {/* Row 2: 4 metric cards */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <MetricCard index={0}
                                        title="Deployment Frequency"
                                        value={snap.deploymentFrequencyDaily?.toFixed(2)}
                                        unit="/day"
                                        tier={snap.deploymentFrequencyTier}
                                        subtitle={`${snap.deploymentCount} successful deployments in window`}
                            />
                            <MetricCard index={1}
                                        title="Lead Time for Changes"
                                        value={lt.value}
                                        unit={lt.unit}
                                        tier={snap.leadTimeTier}
                                        subtitle={snap.leadTimeP50Seconds != null ? `p50 ${formatLeadTime(snap.leadTimeP50Seconds).value}${formatLeadTime(snap.leadTimeP50Seconds).unit} · p95 ${formatLeadTime(snap.leadTimeP95Seconds).value}${formatLeadTime(snap.leadTimeP95Seconds).unit}` : 'no lead time data'}
                            />
                            <MetricCard index={2}
                                        title="Change Failure Rate"
                                        value={snap.changeFailureRate != null ? (snap.changeFailureRate * 100).toFixed(1) : '0.0'}
                                        unit="%"
                                        tier={snap.changeFailureRateTier}
                                        subtitle={`${snap.failedDeployments} of ${snap.totalDeployments} deployments failed`}
                            />
                            <MetricCard index={3}
                                        title="Mean Time to Recovery"
                                        value={mttr.value}
                                        unit={mttr.unit}
                                        tier={snap.mttrTier}
                                        subtitle={snap.mttrAvgSeconds != null ? 'avg time to resolve incidents' : 'no incidents resolved'}
                            />
                        </div>

                        {/* Row 3: Performance ring + CFR donut + Trend */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: '0 0 280px', minWidth: '240px' }}>
                                <PerformanceRing snapshot={snap} />
                            </div>
                            <div style={{ flex: '0 0 240px', minWidth: '200px' }}>
                                <CfrDonut snapshot={snap} />
                            </div>
                            <div style={{ flex: 1, minWidth: '280px' }}>
                                <TrendChart repoId={selectedRepo?.id} window={activeWindow} />
                            </div>
                        </div>

                        {/* Row 4: DORA reference table */}
                        <div className="fade-up-5" style={{
                            background: 'var(--bg2)', border: '1px solid var(--border)',
                            borderRadius: '8px', overflow: 'hidden',
                        }}>
                            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                DORA Tier Reference
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'var(--mono)' }}>
                                    <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                        {['Metric', 'Elite', 'High', 'Medium', 'Low'].map((h, i) => (
                                            <th key={h} style={{ padding: '8px 16px', textAlign: i === 0 ? 'left' : 'center', color: 'var(--muted)', fontWeight: 500 }}>{h}</th>
                                        ))}
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {[
                                        ['Deploy Freq',  'Multiple/day', 'Once/day–week', 'Once/week–month', '< Once/month'],
                                        ['Lead Time',    '< 1 hour',     '1 day – 1 week', '1 week – 1 month', '> 1 month'],
                                        ['Change Fail',  '0 – 5%',       '5 – 10%',      '10 – 15%',        '> 15%'],
                                        ['MTTR',         '< 1 hour',     '< 1 day',      '< 1 week',        '> 1 week'],
                                    ].map((row, ri) => (
                                        <tr key={ri} style={{ borderBottom: '1px solid var(--border)', background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                            {row.map((cell, ci) => (
                                                <td key={ci} style={{
                                                    padding: '8px 16px',
                                                    textAlign: ci === 0 ? 'left' : 'center',
                                                    color: ci === 0 ? 'var(--text)' : ci === 1 ? 'var(--elite)' : ci === 2 ? 'var(--high)' : ci === 3 ? 'var(--medium)' : 'var(--low)',
                                                }}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}