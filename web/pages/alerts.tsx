type Alert = { id: string; household: string; status: 'ok' | 'unanswered' | 'tired' | 'help'; minutes: number };

const sample: Alert[] = [
  { id: 'a1', household: '山田花子（5339-24）', status: 'unanswered', minutes: 8 },
  { id: 'a2', household: '佐藤太郎（5339-25）', status: 'ok', minutes: 3 },
  { id: 'a3', household: '鈴木一郎（5339-24）', status: 'help', minutes: 1 },
];

function statusColor(s: Alert['status']) {
  return s === 'ok' ? '#1E834F' : s === 'unanswered' ? '#B32424' : s === 'tired' ? '#C76F00' : '#6B3FA0';
}

export default function AlertsPage() {
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
        {sample.map(a => (
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
