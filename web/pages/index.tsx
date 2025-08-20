import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { alertsApi, weatherApi } from '../lib/api';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { PlanBasedDashboard } from '../components/PlanBasedDashboard';

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
            <button
              onClick={() => router.push('/alerts')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              アラート管理
            </button>
            <button
              onClick={() => router.push('/households')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              世帯管理
            </button>
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

      {/* プラン別ダッシュボード */}
      <PlanBasedDashboard 
        summary={summary}
        weather={weather}
        todayAlerts={todayAlerts || []}
      />
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}