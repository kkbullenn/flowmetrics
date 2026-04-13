import TierBadge from './TierBadge';

export default function MetricCard({ title, value, unit, tier, subtitle }) {
    return (
        <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '200px',
            flex: 1,
        }}>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
                {title}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                {value ?? '—'}
                {unit && <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280', marginLeft: '4px' }}>{unit}</span>}
            </div>
            {subtitle && (
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{subtitle}</div>
            )}
            <div style={{ marginTop: '4px' }}>
                <TierBadge tier={tier} />
            </div>
        </div>
    );
}