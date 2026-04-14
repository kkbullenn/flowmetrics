import { useCallback, useEffect, useRef, useState } from 'react';
import { getRepositories, getLatestSnapshots } from '../api/metrics';
import MetricCard from '../components/MetricCard';
import CfrDonut from '../components/CfrDonut';
import TrendChart from '../components/TrendChart';
import PerformanceRing from '../components/PerformanceRing';
import TierBadge, { TIER_CONFIG } from '../components/TierBadge';
import Toast from '../components/Toast';

const WINDOWS = [
    { key: 'last_7_days',  label: '7D',  kbd: '1' },
    { key: 'last_30_days', label: '30D', kbd: '2' },
    { key: 'last_90_days', label: '90D', kbd: '3' },
];

const TIER_ORDER = ['low', 'medium', 'high', 'elite'];
const TIER_COLS  = ['elite', 'high', 'medium', 'low'];

function formatLeadTime(s) {
    if (s == null) return { value: '—', unit: '' };
    if (s < 3600)  return { value: Math.round(s / 60),       unit: 'min'  };
    if (s < 86400) return { value: (s / 3600).toFixed(1),    unit: 'hrs'  };
    return             { value: (s / 86400).toFixed(1),   unit: 'days' };
}

function formatMttr(s) { return formatLeadTime(s); }

function relativeTime(ts) {
    if (!ts) return null;
    const diff = Math.floor((Date.now() - ts * 1000) / 1000);
    if (diff < 5)    return 'just now';
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

function overallScore(snap) {
    if (!snap) return 0;
    const tiers = [snap.deploymentFrequencyTier, snap.leadTimeTier, snap.changeFailureRateTier, snap.mttrTier];
    return tiers.reduce((sum, t) => sum + (TIER_ORDER.indexOf(t) + 1 || 1), 0);
}

// Skeleton card shown while loading
function SkeletonCard() {
    return (
        <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderTop: '2px solid var(--border2)', borderRadius: '8px',
            padding: '20px', flex: 1, minWidth: '180px',
        }}>
            <div className="skeleton" style={{ height: '10px', width: '55%', marginBottom: '16px', borderRadius: '3px' }} />
            <div className="skeleton" style={{ height: '34px', width: '36%', marginBottom: '8px', borderRadius: '3px' }} />
            <div className="skeleton" style={{ height: '10px', width: '75%', marginBottom: '16px', borderRadius: '3px' }} />
            <div className="skeleton" style={{ height: '22px', width: '30%', borderRadius: '10px' }} />
        </div>
    );
}

function SkeletonPanel({ height = 200 }) {
    return (
        <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '20px', flex: 1, minWidth: '240px',
        }}>
            <div className="skeleton" style={{ height: '10px', width: '40%', marginBottom: '20px', borderRadius: '3px' }} />
            <div className="skeleton" style={{ height: height - 60, borderRadius: '4px' }} />
        </div>
    );
}

export default function Dashboard() {
    const [repos, setRepos]             = useState([]);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [snapshots, setSnapshots]     = useState([]);
    const [activeWindow, setActiveWindow] = useState('last_7_days');
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState(null);
    const [toasts, setToasts]           = useState([]);
    const [now, setNow]                 = useState(Date.now());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const toastIdRef                    = useRef(0);

    // Keep relative time ticking
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 15000);
        return () => clearInterval(id);
    }, []);

    const addToast = useCallback((message, type = 'success') => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const loadSnapshots = useCallback((repo, silent = false) => {
        if (!repo) return;
        if (!silent) setLoading(true);
        else setIsRefreshing(true);
        setError(null);
        getLatestSnapshots(repo.id)
            .then(data => {
                setSnapshots(data);
                setLoading(false);
                setIsRefreshing(false);
                if (silent) addToast('Metrics refreshed');
            })
            .catch(() => {
                setError('Failed to load metrics');
                setLoading(false);
                setIsRefreshing(false);
                if (silent) addToast('Failed to refresh metrics', 'error');
            });
    }, [addToast]);

    useEffect(() => {
        getRepositories()
            .then(data => {
                setRepos(data);
                if (data.length > 0) setSelectedRepo(data[0]);
            })
            .catch(() => setError('Failed to load repositories'));
    }, []);

    useEffect(() => {
        if (selectedRepo) loadSnapshots(selectedRepo);
    }, [selectedRepo]); // eslint-disable-line react-hooks/exhaustive-deps

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === '1') setActiveWindow('last_7_days');
            if (e.key === '2') setActiveWindow('last_30_days');
            if (e.key === '3') setActiveWindow('last_90_days');
            if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) {
                loadSnapshots(selectedRepo, true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedRepo, loadSnapshots]);

    const snap = snapshots.find(s => s.metricWindow === activeWindow);
    const lt   = formatLeadTime(snap?.leadTimeAvgSeconds);
    const mttr = formatMttr(snap?.mttrAvgSeconds);
    const score    = overallScore(snap);
    const scorePct = (score / 16) * 100;
    const overallCfg = TIER_CONFIG[snap?.overallTier] || TIER_CONFIG.low;

    // Which tier are we in per row for reference table highlight
    const snapTiers = snap ? [
        snap.deploymentFrequencyTier,
        snap.leadTimeTier,
        snap.changeFailureRateTier,
        snap.mttrTier,
    ] : [];

    return (
        <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column' }}>

            {/* Top nav */}
            <header style={{
                borderBottom: '1px solid var(--border)',
                padding: '0 28px',
                display: 'flex', alignItems: 'center', height: '52px', gap: '16px',
                background: 'rgba(15,17,23,0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="0"  y="10" width="4" height="10" rx="1" fill="var(--high)"   />
                        <rect x="5"  y="6"  width="4" height="14" rx="1" fill="var(--elite)"  />
                        <rect x="10" y="2"  width="4" height="18" rx="1" fill="var(--accent)" />
                        <rect x="15" y="8"  width="4" height="12" rx="1" fill="var(--medium)" />
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
                        }}>
                            {w.label}
                        </button>
                    ))}
                </div>

                {/* Right side */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Refresh button */}
                    <button
                        onClick={() => loadSnapshots(selectedRepo, true)}
                        disabled={!selectedRepo || isRefreshing}
                        title="Refresh metrics (R)"
                        style={{
                            padding: '5px 7px', borderRadius: '5px',
                            border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--muted)', cursor: 'pointer', lineHeight: 1,
                            transition: 'color 0.15s, border-color 0.15s',
                            opacity: (!selectedRepo || isRefreshing) ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                        <span className={isRefreshing ? 'spin' : ''} style={{ display: 'inline-block', fontSize: '13px' }}>↻</span>
                    </button>

                    {/* Repo selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>repo</span>
                        <select
                            value={selectedRepo?.id ?? ''}
                            onChange={e => setSelectedRepo(repos.find(r => r.id === e.target.value))}
                            style={{
                                padding: '5px 10px', borderRadius: '5px',
                                border: '1px solid var(--border)', fontSize: '12px',
                                color: 'var(--text)', background: 'var(--bg3)', cursor: 'pointer',
                                fontFamily: 'var(--mono)',
                            }}
                        >
                            {repos.map(r => <option key={r.id} value={r.id}>{r.fullName}</option>)}
                        </select>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main style={{ flex: 1, padding: '24px 28px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>

                {error && (
                    <div style={{ padding: '10px 14px', background: 'var(--low-bg)', color: 'var(--low)', borderRadius: '6px', marginBottom: '20px', fontFamily: 'var(--mono)', fontSize: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                        ⚠ {error}
                    </div>
                )}

                {loading ? (
                    /* ── Skeleton loading state ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                            <div className="skeleton" style={{ height: '16px', width: '30%', borderRadius: '3px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <SkeletonPanel height={220} />
                            <SkeletonPanel height={220} />
                            <SkeletonPanel height={220} />
                        </div>
                    </div>
                ) : !snap ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px', flexDirection: 'column', gap: '12px' }}>
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.3">
                            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                            <line x1="10" y1="20" x2="30" y2="20" stroke="currentColor" strokeWidth="1.5" />
                            <line x1="20" y1="10" x2="20" y2="30" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        <span>no data for this window</span>
                        <span style={{ fontSize: '11px', opacity: 0.6 }}>push commits to generate metrics</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Row 1: status bar */}
                        <div className="fade-up" style={{
                            display: 'flex', alignItems: 'center', gap: '0',
                            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px',
                            overflow: 'hidden',
                        }}>
                            {/* Score progress bar stripe on left */}
                            <div style={{
                                width: '4px', alignSelf: 'stretch', flexShrink: 0,
                                background: `linear-gradient(to bottom, ${overallCfg.color}, ${overallCfg.color}44)`,
                            }} />

                            <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '14px', flex: 1, flexWrap: 'wrap' }}>
                                {/* Live dot */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: overallCfg.color, boxShadow: `0 0 6px ${overallCfg.color}`, flexShrink: 0, display: 'inline-block' }} />
                                    <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        {selectedRepo?.fullName}
                                    </span>
                                </div>

                                <div style={{ width: '1px', height: '16px', background: 'var(--border)', flexShrink: 0 }} />
                                <TierBadge tier={snap.overallTier} size="lg" />

                                <div style={{ width: '1px', height: '16px', background: 'var(--border)', flexShrink: 0 }} />

                                {/* Score progress */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '80px', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', width: `${scorePct}%`,
                                            background: overallCfg.color,
                                            boxShadow: `0 0 6px ${overallCfg.color}`,
                                            borderRadius: '2px',
                                            transition: 'width 0.8s ease',
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                                        {score}/16
                                    </span>
                                </div>

                                <div style={{ width: '1px', height: '16px', background: 'var(--border)', flexShrink: 0 }} />
                                <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                                    {snap.totalDeployments} deploys
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                                    · {snap.incidentCount} incidents
                                </span>

                                <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                                    {relativeTime(snap.computedAt)}
                                </span>
                            </div>
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
                                value={lt.value !== '—' ? lt.value : null}
                                unit={lt.unit}
                                tier={snap.leadTimeTier}
                                subtitle={snap.leadTimeP50Seconds != null
                                    ? `p50 ${formatLeadTime(snap.leadTimeP50Seconds).value}${formatLeadTime(snap.leadTimeP50Seconds).unit} · p95 ${formatLeadTime(snap.leadTimeP95Seconds).value}${formatLeadTime(snap.leadTimeP95Seconds).unit}`
                                    : 'no lead time data'}
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
                                value={mttr.value !== '—' ? mttr.value : null}
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
                                            <th style={{ padding: '8px 16px', textAlign: 'left', color: 'var(--muted)', fontWeight: 500 }}>Metric</th>
                                            {TIER_COLS.map(t => {
                                                const tc = TIER_CONFIG[t];
                                                return (
                                                    <th key={t} style={{ padding: '8px 16px', textAlign: 'center', color: tc.color, fontWeight: 600 }}>
                                                        {tc.label}
                                                    </th>
                                                );
                                            })}
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
                                                {row.map((cell, ci) => {
                                                    const tierForCol = TIER_COLS[ci - 1];
                                                    const isCurrent  = ci > 0 && snapTiers[ri] === tierForCol;
                                                    const tc         = ci > 0 ? TIER_CONFIG[tierForCol] : null;
                                                    return (
                                                        <td key={ci} style={{
                                                            padding: '8px 16px',
                                                            textAlign: ci === 0 ? 'left' : 'center',
                                                            color: ci === 0 ? 'var(--text)' : tc?.color,
                                                            background: isCurrent ? `${tc?.color}12` : 'transparent',
                                                            fontWeight: isCurrent ? 600 : 400,
                                                            position: 'relative',
                                                            transition: 'background 0.2s',
                                                        }}>
                                                            {cell}
                                                            {isCurrent && (
                                                                <span style={{
                                                                    position: 'absolute', top: '50%', right: '6px',
                                                                    transform: 'translateY(-50%)',
                                                                    width: '5px', height: '5px', borderRadius: '50%',
                                                                    background: tc?.color, boxShadow: `0 0 5px ${tc?.color}`,
                                                                }} />
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}
            </main>

            {/* Keyboard shortcuts hint */}
            <div style={{
                position: 'fixed', bottom: '16px', right: '16px',
                background: 'rgba(15,17,23,0.8)',
                border: '1px solid var(--border)',
                borderRadius: '6px', padding: '7px 12px',
                fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--muted)',
                display: 'flex', gap: '12px', alignItems: 'center',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                userSelect: 'none',
                pointerEvents: 'none',
            }}>
                <span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> window</span>
                <span style={{ color: 'var(--border2)' }}>·</span>
                <span><kbd>R</kbd> refresh</span>
            </div>

            {/* Toast notifications */}
            <div style={{ position: 'fixed', bottom: '56px', right: '16px', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                {toasts.map(t => (
                    <Toast key={t.id} message={t.message} type={t.type} onDismiss={() => removeToast(t.id)} />
                ))}
            </div>
        </div>
    );
}
