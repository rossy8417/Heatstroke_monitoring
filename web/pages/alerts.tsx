import { useEffect, useState } from 'react';

type Alert = { id: string; household: string; status: 'ok' | 'unanswered' | 'tired' | 'help'; minutes: number };

function statusColor(s: Alert['status']) {
  return s === 'ok' ? '#1E834F' : s === 'unanswered' ? '#B32424' : s === 'tired' ? '#C76F00' : '#6B3FA0';
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  useEffect(() => {
    fetch('http://localhost:3000/stub/alerts/today').then(r => r.json()).then(j => setAlerts(j.data));
  }, []);
  async function retryCall(alertId: string) {
    try {
      setPendingId(alertId);
      setMessage(null);
      const res = await fetch('http://localhost:3000/stub/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId }),
      });
      const j = await res.json();
      if (res.ok) setMessage(`再コールを送信しました (call_id: ${j.call_id})`);
      else setMessage(`エラー: ${j?.error || res.status}`);
    } catch (e: any) {
      setMessage(`エラー: ${e?.message || 'unknown'}`);
    } finally {
      setPendingId(null);
    }
  }
  async function lineTakeCare(alertId: string) {
    try {
      const res = await fetch('http://localhost:3000/stub/line/postback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'take_care', alert_id: alertId }),
      });
      const j = await res.json();
      if (res.ok) {
        setAlerts(prev => (prev || []).map(a => (a.id === alertId ? { ...a, status: j.alert.status as any } : a)));
        setMessage('対応中を記録しました');
      } else setMessage(`エラー: ${j?.error || res.status}`);
    } catch (e: any) {
      setMessage(`エラー: ${e?.message || 'unknown'}`);
    }
  }
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>当日アラート一覧（ダミー）</h1>
      {message && (
        <div style={{ background: '#eef7ff', border: '1px solid #b6dbff', padding: 8, marginBottom: 12 }}>{message}</div>
      )}
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
              <button onClick={() => retryCall(a.id)} disabled={pendingId === a.id} style={{ padding: '8px 12px' }}>
                {pendingId === a.id ? '送信中...' : '再コール'}
              </button>
              <button onClick={() => lineTakeCare(a.id)} style={{ padding: '8px 12px' }}>対応中</button>
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
