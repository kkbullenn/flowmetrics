import { TIER_CONFIG } from './TierBadge';

const TIER_SCORE = { elite: 4, high: 3, medium: 2, low: 1 };
const TIER_ORDER = ['low', 'medium', 'high', 'elite'];

function tierScore(tier) { return TIER_SCORE[tier] ?? 1; }

export default function PerformanceRing({ snapshot }) {
    if (!snapshot) return null;

    const tiers = [
        { label: 'DF',   tier: snapshot.deploymentFrequencyTier, full: 'Deploy Freq' },
        { label: 'LT',   tier: snapshot.leadTimeTier,            full: 'Lead Time'   },
        { label: 'CFR',  tier: snapshot.changeFailureRateTier,   full: 'Change Fail' },
        { label: 'MTTR', tier: snapshot.mttrTier,                full: 'MTTR'        },
    ];

    const overall = snapshot.overallTier;
    const cfg = TIER_CONFIG[overall] || TIER_CONFIG.low;

    // SVG ring
    const r = 44, cx = 60, cy = 60;
    const circumference = 2 * Math.PI * r;
    const score = tierScore(overall);
    const pct = score / 4;
    const dash = circumference * pct;

    return (
        <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Performance Score
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                {/* Ring */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
                        <circle cx={cx} cy={cy} r={r} fill="none"
                                stroke={cfg.color} strokeWidth="8"
                                strokeDasharray={`${dash} ${circumference}`}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${cx} ${cy})`}
                                style={{ filter: `drop-shadow(0 0 6px ${cfg.color})`, transition: 'stroke-dasharray 0.8s ease' }}
                        />
                        {/* Pulse rings */}
                        <circle cx={cx} cy={cy} r={r} fill="none"
                                stroke={cfg.color} strokeWidth="2" opacity="0"
                                style={{ animation: 'pulse-ring 2s ease-out infinite' }}
                        />
                    </svg>
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', fontWeight: 700, color: cfg.color, letterSpacing: '0.06em' }}>
              {cfg.label?.toUpperCase()}
            </span>
                        <span style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>overall</span>
                    </div>
                </div>

                {/* Per-metric breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    {tiers.map(({ label, tier, full }) => {
                        const tc = TIER_CONFIG[tier] || TIER_CONFIG.low;
                        const pct = (tierScore(tier) / 4) * 100;
                        return (
                            <div key={label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                    <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{full}</span>
                                    <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: tc.color }}>{tc.label}</span>
                                </div>
                                <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', width: `${pct}%`,
                                        background: tc.color, borderRadius: '2px',
                                        boxShadow: `0 0 6px ${tc.color}`,
                                        transition: 'width 0.8s ease',
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}