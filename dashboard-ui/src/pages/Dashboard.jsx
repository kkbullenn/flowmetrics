import { useEffect, useState } from 'react';
import { getRepositories, getLatestSnapshots } from '../api/metrics';
import DoraScorecard from '../components/DoraScorecard';

const WINDOWS = [
    { key: 'last_7_days',  label: 'Last 7 days' },
    { key: 'last_30_days', label: 'Last 30 days' },
    { key: 'last_90_days', label: 'Last 90 days' },
];

export default function Dashboard() {
    const [repos, setRepos]           = useState([]);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const [snapshots, setSnapshots]   = useState([]);
    const [activeWindow, setActiveWindow] = useState('last_30_days');
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState(null);

    // Load repositories on mount
    useEffect(() => {
        getRepositories()
            .then(data => {
                setRepos(data);
                if (data.length > 0) setSelectedRepo(data[0]);
            })
            .catch(() => setError('Failed to load repositories'));
    }, []);

    // Load snapshots when repo changes
    useEffect(() => {
        if (!selectedRepo) return;
        setLoading(true);
        getLatestSnapshots(selectedRepo.id)
            .then(data => {
                setSnapshots(data);
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load metrics');
                setLoading(false);
            });
    }, [selectedRepo]);

    const activeSnapshot = snapshots.find(s => s.metricWindow === activeWindow);

    return (
        <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'system-ui, sans-serif' }}>

            {/* Header */}
            <div style={{
                background: '#ffffff',
                borderBottom: '1px solid #e5e7eb',
                padding: '0 32px',
                display: 'flex',
                alignItems: 'center',
                height: '60px',
                gap: '16px',
            }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                    FlowMetrics
                </span>
                <span style={{ color: '#d1d5db' }}>|</span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>DORA Dashboard</span>

                {/* Repo selector */}
                <div style={{ marginLeft: 'auto' }}>
                    <select
                        value={selectedRepo?.id ?? ''}
                        onChange={e => setSelectedRepo(repos.find(r => r.id === e.target.value))}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '14px',
                            color: '#374151',
                            background: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        {repos.map(r => (
                            <option key={r.id} value={r.id}>{r.fullName}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main content */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>

                {error && (
                    <div style={{
                        padding: '12px 16px',
                        background: '#fee2e2',
                        color: '#991b1b',
                        borderRadius: '8px',
                        marginBottom: '24px',
                    }}>
                        {error}
                    </div>
                )}

                {/* Window selector */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {WINDOWS.map(w => (
                        <button
                            key={w.key}
                            onClick={() => setActiveWindow(w.key)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: activeWindow === w.key ? '#2563eb' : '#d1d5db',
                                background: activeWindow === w.key ? '#2563eb' : '#ffffff',
                                color: activeWindow === w.key ? '#ffffff' : '#374151',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            {w.label}
                        </button>
                    ))}
                </div>

                {/* Scorecard */}
                {loading ? (
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>Loading metrics...</div>
                ) : activeSnapshot ? (
                    <DoraScorecard snapshot={activeSnapshot} />
                ) : (
                    <div style={{
                        padding: '48px',
                        textAlign: 'center',
                        color: '#6b7280',
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                    }}>
                        No data available for this time window yet.
                        Push a commit to your repository to generate metrics.
                    </div>
                )}

                {/* Footer info */}
                {activeSnapshot && (
                    <div style={{ marginTop: '24px', fontSize: '12px', color: '#9ca3af' }}>
                        Last computed: {new Date(activeSnapshot.computedAt * 1000).toLocaleString()}
                        {' · '}
                        Window: {new Date(activeSnapshot.windowStart * 1000).toLocaleDateString()}
                        {' — '}
                        {new Date(activeSnapshot.windowEnd * 1000).toLocaleDateString()}
                    </div>
                )}
            </div>
        </div>
    );
}