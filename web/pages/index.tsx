import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { alertsApi, weatherApi } from '../lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';

function DashboardContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: summary } = useQuery({
    queryKey: ['alertsSummary'],
    queryFn: alertsApi.getSummary,
    refetchInterval: 30000, // 30秒ごとに更新
  });

  const { data: weather } = useQuery({
    queryKey: ['weather'],
    queryFn: () => weatherApi.getCurrent(),
    refetchInterval: 300000, // 5分ごとに更新
  });

  const { data: todayAlerts } = useQuery({
    queryKey: ['todayAlerts'],
    queryFn: alertsApi.getToday,
    refetchInterval: 30000,
  });

  const chartData = summary ? [
    { name: 'OK', value: summary.ok || 0, color: '#10b981' },
    { name: '未応答', value: summary.unanswered || 0, color: '#ef4444' },
    { name: '疲れ', value: summary.tired || 0, color: '#f59e0b' },
    { name: '要支援', value: summary.help || 0, color: '#8b5cf6' },
    { name: 'エスカレーション', value: summary.escalated || 0, color: '#ec4899' },
  ].filter(item => item.value > 0) : [];

  const totalAlerts = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
            熱中症見守りシステム
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {user?.email}
            </span>
            <button
              onClick={() => signOut()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* 気象情報カード */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            現在の気象状況
          </h2>
          {weather ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>気温</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>{weather.temp}℃</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>湿度</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>{weather.humidity}%</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>WBGT</div>
                <div style={{ fontSize: '24px', fontWeight: '600' }}>{weather.wbgt}</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>警戒レベル</div>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: '600',
                  color: weather.level === '危険' ? '#ef4444' : 
                         weather.level === '厳重警戒' ? '#f59e0b' :
                         weather.level === '警戒' ? '#eab308' : '#10b981'
                }}>
                  {weather.level}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#6b7280' }}>データ取得中...</div>
          )}
        </div>

        {/* 統計カード */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* アラート統計 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              本日のアラート
            </h2>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              {totalAlerts}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              総アラート数
            </div>
          </div>

          {/* 応答率 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              応答率
            </h2>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
              {totalAlerts > 0 ? Math.round(((summary?.ok || 0) / totalAlerts) * 100) : 0}%
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              正常応答 / 全アラート
            </div>
          </div>

          {/* 要対応 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              要対応
            </h2>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
              {(summary?.unanswered || 0) + (summary?.help || 0) + (summary?.escalated || 0)}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              未応答 + 要支援 + エスカレーション
            </div>
          </div>
        </div>

        {/* グラフとリンク */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* 円グラフ */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              アラート内訳
            </h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                データがありません
              </div>
            )}
          </div>

          {/* クイックリンク */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              クイックアクセス
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => router.push('/alerts')}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '6px',
                  border: 'none',
                  textAlign: 'center',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                アラート一覧
              </button>
              <button
                onClick={() => router.push('/households')}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '6px',
                  border: 'none',
                  textAlign: 'center',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                世帯管理
              </button>
              <button
                onClick={() => router.push('/reports')}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  borderRadius: '6px',
                  border: 'none',
                  textAlign: 'center',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                レポート
              </button>
            </div>
          </div>
        </div>

        {/* 最近のアラート */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            最近のアラート
          </h2>
          {todayAlerts && todayAlerts.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>時刻</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>世帯名</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>ステータス</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>WBGT</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>レベル</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAlerts.slice(0, 5).map((alert: any) => (
                    <tr key={alert.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px', fontSize: '14px' }}>
                        {new Date(alert.first_trigger_at || alert.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '8px', fontSize: '14px' }}>{alert.household?.name || '不明'}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: 
                            alert.status === 'ok' ? '#d1fae5' :
                            alert.status === 'unanswered' ? '#fee2e2' :
                            alert.status === 'tired' ? '#fed7aa' :
                            alert.status === 'help' ? '#ddd6fe' : '#fce7f3',
                          color:
                            alert.status === 'ok' ? '#065f46' :
                            alert.status === 'unanswered' ? '#991b1b' :
                            alert.status === 'tired' ? '#92400e' :
                            alert.status === 'help' ? '#5b21b6' : '#831843',
                        }}>
                          {alert.status === 'ok' ? 'OK' :
                           alert.status === 'unanswered' ? '未応答' :
                           alert.status === 'tired' ? '疲れ' :
                           alert.status === 'help' ? '要支援' : 'エスカレーション'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontSize: '14px' }}>{alert.wbgt}</td>
                      <td style={{ padding: '8px', fontSize: '14px' }}>{alert.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
              本日のアラートはまだありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute requiredUserType="business">
      <DashboardContent />
    </ProtectedRoute>
  );
}