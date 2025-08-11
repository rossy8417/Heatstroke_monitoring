import { useEffect, useState } from 'react';

type Alert = { id: string; household: string; status: 'ok' | 'unanswered' | 'tired' | 'help'; minutes: number };

function statusColor(s: Alert['status']) {
  return s === 'ok' ? '#1E834F' : s === 'unanswered' ? '#B32424' : s === 'tired' ? '#C76F00' : '#6B3FA0';
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  useEffect(() => {
    fetch('http://localhost:3000/stub/alerts/today').then(r => r.json()).then(j => setAlerts(j.data));
  }, []);
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>当日アラート一覧（ダミー）</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Kpi label="OK" value={1} color="#1E834F" />
        <Kpi label="未応答" value={1} color="#B32424" />
        <Kpi label="要フォロー" value={0} color="#C76F00" />
        <Kpi label="至急" value={1} color="#6B3FA0" />
      </div>
      <div>
        {(alerts ?? []).map(a => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 180px', alignItems: 'center', padding: '12px 8px', borderBottom: '1px solid #eee' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{a.household}</div>
            </div>
            <div style={{ color: statusColor(a.status), fontWeight: 700 }}>
              {a.status === 'ok' ? 'OK' : a.status === 'unanswered' ? '未応答' : a.status === 'tired' ? 'しんどい' : 'ヘルプ'}
              <span style={{ color: '#666', marginLeft: 8, fontWeight: 400 }}>（{a.minutes}分前）</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: '8px 12px' }}>再コール</button>
              <button style={{ padding: '8px 12px' }}>詳細</button>
            </div>
          </div>
        ))}
        {alerts?.length === 0 && <div>対象なし</div>}
        {alerts === null && <div>読み込み中...</div>}
      </div>
    </main>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#fafafa', border: '1px solid #eee', borderLeft: `6px solid ${color}`, padding: 12, minWidth: 120 }}>
      <div style={{ color: '#333', fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
