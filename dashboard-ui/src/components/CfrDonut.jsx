import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import TierBadge from './TierBadge';

export default function CfrDonut({ snapshot }) {
    if (!snapshot) return null;
    const failed  = snapshot.failedDeployments ?? 0;
    const success = (snapshot.totalDeployments ?? 0) - failed;
    const data = [
        { name: 'Success', value: success },
        { name: 'Failed',  value: failed  },
    ];
    const cfrPct = snapshot.changeFailureRate != null
        ? (snapshot.changeFailureRate * 100).toFixed(1)
        : '0.0';

    return (
        <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '20px', display: 'flex',
            flexDirection: 'column', gap: '12px',
        }}>
            <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Deployment Outcomes
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} cx="50%" cy="50%" innerRadius={34} outerRadius={50}
                                 dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                                <Cell fill="var(--elite)" />
                                <Cell fill="var(--low)" />
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', fontFamily: 'var(--mono)', fontSize: '11px' }}
                                itemStyle={{ color: 'var(--text)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{cfrPct}%</span>
                        <span style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>FAIL</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                    {[
                        { label: 'Successful', value: success, color: 'var(--elite)' },
                        { label: 'Failed',     value: failed,  color: 'var(--low)'   },
                    ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}`, flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', color: 'var(--muted)', flex: 1 }}>{item.label}</span>
                            <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{item.value}</span>
                        </div>
                    ))}
                    <div style={{ marginTop: '4px' }}>
                        <TierBadge tier={snapshot.changeFailureRateTier} />
                    </div>
                </div>
            </div>
        </div>
    );
}