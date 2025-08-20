import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PlanBasedDashboardProps {
  summary: any;
  weather: any;
  todayAlerts: any[];
}

interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'personal' | 'family' | 'business';
  max_households: number;
  max_contacts: number;
  features: string[];
  status: 'active' | 'inactive' | 'cancelled';
}

export const PlanBasedDashboard: React.FC<PlanBasedDashboardProps> = ({
  summary,
  weather,
  todayAlerts
}) => {
  const router = useRouter();
  const { user } = useAuth();

  // ユーザーのサブスクリプション情報を取得
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['userSubscription'],
    queryFn: async () => {
      const response = await fetch('/api/user/subscription', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }
      return response.json() as SubscriptionPlan;
    },
    enabled: !!user,
  });

  // ユーザーの世帯情報を取得
  const { data: userHouseholds } = useQuery({
    queryKey: ['userHouseholds'],
    queryFn: async () => {
      const response = await fetch('/api/user/households', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch households');
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!user,
  });

  if (subscriptionLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <div>プラン情報を取得中...</div>
        </div>
      </div>
    );
  }

  const planType = subscription?.type || 'personal';
  const currentHouseholds = userHouseholds?.length || 0;
  const maxHouseholds = subscription?.max_households || 1;

  const chartData = summary ? [
    { name: 'OK', value: summary.ok || 0, color: '#10b981' },
    { name: '未応答', value: summary.unanswered || 0, color: '#ef4444' },
    { name: '疲れ', value: summary.tired || 0, color: '#f59e0b' },
    { name: '要支援', value: summary.help || 0, color: '#8b5cf6' },
    { name: 'エスカレーション', value: summary.escalated || 0, color: '#ec4899' },
  ].filter(item => item.value > 0) : [];

  const totalAlerts = chartData.reduce((sum, item) => sum + item.value, 0);

  const getFeatureVisibility = (feature: string) => {
    const featureMap = {
      'advanced_analytics': planType !== 'personal',
      'export_data': planType === 'business',
      'multi_user_management': planType === 'business',
      'custom_alerts': planType !== 'personal',
      'api_access': planType === 'business',
      'priority_support': planType !== 'personal'
    };
    return featureMap[feature] || false;
  };

  const getPlanColor = () => {
    switch (planType) {
      case 'personal': return '#6b7280';
      case 'family': return '#3b82f6';
      case 'business': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPlanDisplayName = () => {
    switch (planType) {
      case 'personal': return 'パーソナル';
      case 'family': return 'ファミリー';
      case 'business': return 'ビジネス';
      default: return '不明';
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* プラン情報バー */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: `2px solid ${getPlanColor()}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              backgroundColor: getPlanColor(),
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {getPlanDisplayName()}プラン
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {currentHouseholds}/{maxHouseholds === 0 ? '無制限' : maxHouseholds} 世帯登録済み
            </div>
          </div>
          <button
            onClick={() => router.push('/billing')}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: getPlanColor(),
              border: `1px solid ${getPlanColor()}`,
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            プラン管理
          </button>
        </div>
      </div>

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
          {planType === 'personal' && totalAlerts > 5 && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#fef3c7',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#92400e'
            }}>
              💡 ファミリープランで詳細分析を利用可能
            </div>
          )}
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

      {/* メインコンテンツエリア */}
      <div style={{ display: 'grid', gridTemplateColumns: getFeatureVisibility('advanced_analytics') ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* 円グラフ（パーソナルプランでは簡易版） */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            アラート内訳
            {planType === 'personal' && (
              <span style={{ fontSize: '12px', fontWeight: '400', color: '#6b7280', marginLeft: '8px' }}>
                (基本表示)
              </span>
            )}
          </h2>
          {chartData.length > 0 ? (
            planType === 'personal' ? (
              // パーソナルプラン: シンプルなリスト表示
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {chartData.map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: item.color,
                        borderRadius: '50%'
                      }} />
                      <span style={{ fontSize: '14px' }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: '600' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              // ファミリー・ビジネスプラン: 詳細なグラフ
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
            )
          ) : (
            <div style={{ height: planType === 'personal' ? 150 : 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
              データがありません
            </div>
          )}
        </div>

        {/* 高度な分析（ファミリー・ビジネスプランのみ） */}
        {getFeatureVisibility('advanced_analytics') && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              高度な分析
              <span style={{ fontSize: '12px', fontWeight: '400', color: '#6b7280', marginLeft: '8px' }}>
                ({getPlanDisplayName()}プラン限定)
              </span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '12px',
                backgroundColor: '#f0f9ff',
                borderRadius: '6px',
                border: '1px solid #0ea5e9'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  平均応答時間
                </div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#0ea5e9' }}>
                  2.3分
                </div>
              </div>
              
              <div style={{
                padding: '12px',
                backgroundColor: '#f0fdf4',
                borderRadius: '6px',
                border: '1px solid #10b981'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  今週の改善率
                </div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#10b981' }}>
                  +15%
                </div>
              </div>

              {getFeatureVisibility('export_data') && (
                <button
                  onClick={() => alert('データエクスポート機能（実装予定）')}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  📊 データエクスポート
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* クイックアクション */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          クイックアクション
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
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
            }}
          >
            📋 アラート管理
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
            }}
          >
            👥 世帯管理
          </button>

          {currentHouseholds < maxHouseholds && (
            <button
              onClick={() => router.push('/setup/household')}
              style={{
                padding: '12px 16px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                borderRadius: '6px',
                border: 'none',
                textAlign: 'center',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              ➕ 見守り対象者追加
            </button>
          )}

          {getFeatureVisibility('export_data') && (
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
              }}
            >
              📊 レポート・分析
            </button>
          )}

          {getFeatureVisibility('multi_user_management') && (
            <button
              onClick={() => router.push('/admin/users')}
              style={{
                padding: '12px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                borderRadius: '6px',
                border: 'none',
                textAlign: 'center',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              🔧 ユーザー管理
            </button>
          )}
        </div>
      </div>

      {/* 最近のアラート（プラン別表示制限） */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          最近のアラート
          {planType === 'personal' && (
            <span style={{ fontSize: '12px', fontWeight: '400', color: '#6b7280', marginLeft: '8px' }}>
              (最新5件のみ)
            </span>
          )}
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
                  {getFeatureVisibility('advanced_analytics') && (
                    <th style={{ padding: '8px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>詳細</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {todayAlerts.slice(0, planType === 'personal' ? 5 : 20).map((alert: any) => (
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
                    {getFeatureVisibility('advanced_analytics') && (
                      <td style={{ padding: '8px' }}>
                        <button
                          onClick={() => router.push(`/alerts/${alert.id}`)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          詳細
                        </button>
                      </td>
                    )}
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

      {/* アップグレード促進（パーソナル・ファミリープラン） */}
      {planType !== 'business' && (
        <div style={{
          backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '24px',
          color: 'white'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', margin: 0 }}>
            🚀 より多くの機能をご利用いただけます
          </h3>
          <p style={{ marginBottom: '16px', opacity: 0.9, margin: '12px 0' }}>
            {planType === 'personal' 
              ? 'ファミリープランで高度な分析機能と3世帯まで管理できます' 
              : 'ビジネスプランで無制限の世帯管理とデータエクスポートが利用できます'
            }
          </p>
          <button
            onClick={() => router.push('/billing')}
            style={{
              padding: '10px 20px',
              backgroundColor: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            プランをアップグレード
          </button>
        </div>
      )}
    </div>
  );
};