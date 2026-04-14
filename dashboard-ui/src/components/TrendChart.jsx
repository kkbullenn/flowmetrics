import { useEffect, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { getSnapshots } from '../api/metrics';

const METRICS = [
    { key: 'deploymentFrequencyDaily', label: 'Deploy Freq', unit: '/day',  color: 'var(--high)'   },
    { key: 'changeFailureRate',        label: 'CFR',         unit: '%',     color: 'var(--low)',    transform: v => v * 100 },
    { key: 'leadTimeAvgSeconds',       label: 'Lead Time',   unit: 'min',   color: 'var(--elite)',  transform: v => +(v / 60).toFixed(1) },
    { key: 'mttrAvgSeconds',           label: 'MTTR',        unit: 'min',   color: 'var(--medium)', transform: v => +(v / 60).toFixed(1) },
];

// Map CSS variable names to hex so recharts SVG defs can use them
const COLOR_MAP = {
    'var(--high)':   '#3b82f6',
    'var(--low)':    '#ef4444',
    'var(--elite)':  '#10b981',
    'var(--medium)': '#f59e0b',
};

export default function TrendChart({ repoId, window }) {
    const [data, setData]       = useState([]);
    const [active, setActive]   = useState('deploymentFrequencyDaily');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!repoId) return;
        setLoading(true);
        getSnapshots(repoId, window)
            .then(snaps => {
                const sorted = [...snaps].sort((a, b) => a.computedAt - b.computedAt);
                setData(sorted.map(s => ({
                    date: new Date(s.computedAt * 1000).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                    }),
                    deploymentFrequencyDaily: s.deploymentFrequencyDaily,
                    changeFailureRate: s.changeFailureRate != null ? +(s.changeFailureRate * 100).toFixed(1) : null,
                    leadTimeAvgSeconds: s.leadTimeAvgSeconds != null ? +(s.leadTimeAvgSeconds / 60).toFixed(1) : null,
                    mttrAvgSeconds: s.mttrAvgSeconds != null ? +(s.mttrAvgSeconds / 60).toFixed(1) : null,
                })));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [repoId, window]);

    const metric   = METRICS.find(m => m.key === active);
    const hexColor = COLOR_MAP[metric?.color] ?? '#3b82f6';
    const gradId   = `grad-${active}`;

    return (
        <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '20px',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Trend
                </span>
                <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                    {METRICS.map(m => (
                        <button key={m.key} onClick={() => setActive(m.key)} style={{
                            padding: '4px 10px', borderRadius: '4px', fontSize: '11px',
                            fontFamily: 'var(--mono)', cursor: 'pointer', transition: 'all 0.15s',
                            border: `1px solid ${active === m.key ? m.color : 'var(--border)'}`,
                            background: active === m.key ? `${COLOR_MAP[m.color]}22` : 'transparent',
                            color: active === m.key ? m.color : 'var(--muted)',
                        }}>{m.label}</button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '12px', fontFamily: 'var(--mono)' }}>
                    loading...
                </div>
            ) : data.length < 2 ? (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '6px', color: 'var(--muted)', fontSize: '12px', fontFamily: 'var(--mono)' }}>
                    <span style={{ fontSize: '20px', opacity: 0.4 }}>〰</span>
                    <span>not enough data points yet</span>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                        <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor={hexColor} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={hexColor} stopOpacity={0}    />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 9, fontFamily: 'var(--mono)', fill: 'var(--muted)' }}
                            tickLine={false} axisLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 9, fontFamily: 'var(--mono)', fill: 'var(--muted)' }}
                            tickLine={false} axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', fontFamily: 'var(--mono)', fontSize: '11px' }}
                            itemStyle={{ color: metric?.color }}
                            labelStyle={{ color: 'var(--muted)', marginBottom: '4px' }}
                            formatter={v => [`${v} ${metric?.unit}`, metric?.label]}
                        />
                        <Area
                            type="monotone"
                            dataKey={active}
                            stroke={metric?.color}
                            strokeWidth={2}
                            fill={`url(#${gradId})`}
                            dot={{ fill: hexColor, strokeWidth: 0, r: 3 }}
                            activeDot={{ r: 5, strokeWidth: 0, fill: hexColor }}
                            connectNulls
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
