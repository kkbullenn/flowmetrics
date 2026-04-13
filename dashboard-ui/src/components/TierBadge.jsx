const TIER_STYLES = {
    elite:  { background: '#d1fae5', color: '#065f46', label: 'Elite' },
    high:   { background: '#dbeafe', color: '#1e40af', label: 'High' },
    medium: { background: '#fef3c7', color: '#92400e', label: 'Medium' },
    low:    { background: '#fee2e2', color: '#991b1b', label: 'Low' },
};

export default function TierBadge({ tier }) {
    if (!tier) return <span style={{ color: '#6b7280' }}>—</span>;
    const style = TIER_STYLES[tier] || TIER_STYLES.low;
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 600,
            background: style.background,
            color: style.color,
        }}>
            {style.label}
        </span>
    );
}