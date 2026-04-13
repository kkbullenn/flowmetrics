export const TIER_CONFIG = {
    elite:  { label: 'Elite',  color: 'var(--elite)',  bg: 'var(--elite-bg)'  },
    high:   { label: 'High',   color: 'var(--high)',   bg: 'var(--high-bg)'   },
    medium: { label: 'Medium', color: 'var(--medium)', bg: 'var(--medium-bg)' },
    low:    { label: 'Low',    color: 'var(--low)',    bg: 'var(--low-bg)'    },
};

export default function TierBadge({ tier, size = 'sm' }) {
    if (!tier) return <span style={{ color: 'var(--muted)' }}>—</span>;
    const cfg = TIER_CONFIG[tier] || TIER_CONFIG.low;
    const px = size === 'lg' ? '5px 14px' : '3px 10px';
    const fs = size === 'lg' ? '13px' : '11px';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: px, borderRadius: '4px', fontSize: fs,
            fontFamily: 'var(--mono)', fontWeight: 600, letterSpacing: '0.04em',
            background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.color}30`,
        }}>
      <span style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: cfg.color, flexShrink: 0,
          boxShadow: `0 0 6px ${cfg.color}`,
      }} />
            {cfg.label}
    </span>
    );
}