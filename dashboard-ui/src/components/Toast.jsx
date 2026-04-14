import { useEffect, useState } from 'react';

export default function Toast({ message, type = 'success', onDismiss }) {
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(onDismiss, 280);
        }, 2600);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const color = type === 'error' ? 'var(--low)' : 'var(--elite)';
    const icon  = type === 'error' ? '⚠' : '✓';

    return (
        <div style={{
            background: 'var(--bg2)',
            border: `1px solid ${color}28`,
            borderLeft: `3px solid ${color}`,
            borderRadius: '6px',
            padding: '10px 16px',
            fontSize: '12px',
            fontFamily: 'var(--mono)',
            color: 'var(--text)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: exiting
                ? 'slideOutRight 0.28s ease forwards'
                : 'slideInRight 0.28s ease both',
            minWidth: '200px',
            whiteSpace: 'nowrap',
        }}>
            <span style={{ color, fontSize: '13px', lineHeight: 1 }}>{icon}</span>
            <span>{message}</span>
        </div>
    );
}
