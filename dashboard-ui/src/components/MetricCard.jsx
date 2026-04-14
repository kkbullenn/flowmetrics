import { useEffect, useRef, useState } from 'react';
import TierBadge, { TIER_CONFIG } from './TierBadge';

const DESCRIPTIONS = {
    'Deployment Frequency':   'How often code ships to production. Multiple deployments per day indicates elite engineering velocity.',
    'Lead Time for Changes':  'Time from commit merged to production. Measures the speed of your end-to-end delivery pipeline.',
    'Change Failure Rate':    'Percentage of deployments that cause a production incident. Lower values reflect higher release quality.',
    'Mean Time to Recovery':  'Average time to restore service after an incident. Measures operational resilience under failure.',
};

function useCountUp(targetStr, duration = 700) {
    const [display, setDisplay] = useState(targetStr ?? '—');
    const rafRef = useRef(null);

    useEffect(() => {
        if (targetStr == null || targetStr === '—') { setDisplay('—'); return; }
        const target = parseFloat(targetStr);
        if (isNaN(target)) { setDisplay(targetStr); return; }

        const decMatch = String(targetStr).match(/\.(\d+)/);
        const decimals = decMatch ? decMatch[1].length : 0;

        let startTime = null;
        const animate = (ts) => {
            if (!startTime) startTime = ts;
            const progress = Math.min((ts - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay((target * eased).toFixed(decimals));
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                setDisplay(targetStr);
            }
        };

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(animate);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [targetStr, duration]);

    return display;
}

export default function MetricCard({ title, value, unit, tier, subtitle, index = 0 }) {
    const cfg  = TIER_CONFIG[tier] || TIER_CONFIG.low;
    const displayValue = useCountUp(String(value ?? '—'));
    const [showTip, setShowTip] = useState(false);
    const description = DESCRIPTIONS[title];

    return (
        <div
            className={`fade-up-${index + 2}`}
            style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderTop: `2px solid ${cfg.color}`,
                borderRadius: '8px',
                padding: '20px',
                flex: 1,
                minWidth: '180px',
                position: 'relative',
                overflow: 'visible',
                transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.borderColor = cfg.color;
                e.currentTarget.style.boxShadow = `0 0 24px ${cfg.color}18`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Background glow */}
            <div style={{
                position: 'absolute', top: 0, right: 0,
                width: '80px', height: '80px',
                background: `radial-gradient(circle at top right, ${cfg.color}10, transparent 70%)`,
                pointerEvents: 'none',
                borderRadius: '8px',
            }} />

            {/* Title row with info icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', position: 'relative' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {title}
                </span>
                {description && (
                    <span
                        onMouseEnter={() => setShowTip(true)}
                        onMouseLeave={() => setShowTip(false)}
                        style={{ fontSize: '11px', color: 'var(--border2)', cursor: 'help', lineHeight: 1, userSelect: 'none', transition: 'color 0.15s' }}
                        onFocus={() => setShowTip(true)}
                        onBlur={() => setShowTip(false)}
                    >ⓘ</span>
                )}
                {showTip && description && (
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
                        background: 'var(--bg3)', border: '1px solid var(--border2)',
                        borderRadius: '6px', padding: '10px 14px',
                        fontSize: '11px', color: 'var(--text)', fontFamily: 'var(--sans)',
                        width: '220px', lineHeight: 1.55,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        pointerEvents: 'none',
                    }}>
                        {description}
                    </div>
                )}
            </div>

            {/* Value */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '32px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)', letterSpacing: '-0.02em' }}>
                    {displayValue}
                </span>
                {unit && (
                    <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{unit}</span>
                )}
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
