import TierBadge, { TIER_CONFIG } from './TierBadge';

export default function MetricCard({ title, value, unit, tier, subtitle, delay = 0, index = 0 }) {
    const cfg = TIER_CONFIG[tier] || TIER_CONFIG.low;
    return (
        <div className={`fade-up-${index + 2}`} style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderTop: `2px solid ${cfg.color}`,
            borderRadius: '8px',
            padding: '20px',
            flex: 1,
            minWidth: '180px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
             onMouseEnter={e => {
                 e.currentTarget.style.borderColor = cfg.color;
                 e.currentTarget.style.boxShadow = `0 0 24px ${cfg.color}18`;
             }}
             onMouseLeave={e => {
                 e.currentTarget.style.borderColor = 'var(--border)';
                 e.currentTarget.style.boxShadow = 'none';
             }}>
            {/* Background glow */}
            <div style={{
                position: 'absolute', top: 0, right: 0,
                width: '80px', height: '80px',
                background: `radial-gradient(circle at top right, ${cfg.color}10, transparent 70%)`,
                pointerEvents: 'none',
            }} />

            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                {title}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
        <span style={{ fontSize: '32px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)', letterSpacing: '-0.02em' }}>
          {value ?? '—'}
        </span>
                {unit && <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{unit}</span>}
            </div>

            {subtitle && (
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px', lineHeight: 1.4 }}>
                    {subtitle}
                </div>
            )}

            <TierBadge tier={tier} />
        </div>
    );
}