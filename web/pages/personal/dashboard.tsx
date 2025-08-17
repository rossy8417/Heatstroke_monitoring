import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { alertsApi, weatherApi } from '../../lib/api';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

/**
 * 個人・家族向けダッシュボード
 * シンプルで見やすいUI
 */
const PersonalDashboardContent: React.FC = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  // 自分の世帯のアラートのみ取得
  const { data: myAlert } = useQuery({
    queryKey: ['myAlert'],
    queryFn: async () => {
      // TODO: 自分の世帯IDでフィルタリング
      const alerts = await alertsApi.getToday();
      return alerts[0]; // 仮実装：最初のアラート
    },
    refetchInterval: 30000,
  });

  // 気象情報
  const { data: weather } = useQuery({
    queryKey: ['weather'],
    queryFn: () => weatherApi.getCurrent(),
    refetchInterval: 5 * 60 * 1000,
  });

  // ステータスに応じた表示
  const getStatusDisplay = () => {
    if (!myAlert) {
      return {
        emoji: '✅',
        text: '今日はまだ確認がありません',
        color: '#10b981',
        bg: '#d1fae5',
      };
    }

    switch (myAlert.status) {
      case 'ok':
        return {
          emoji: '😊',
          text: '元気です！',
          color: '#10b981',
          bg: '#d1fae5',
        };
      case 'unanswered':
        return {
          emoji: '📞',
          text: '確認中...',
          color: '#f59e0b',
          bg: '#fed7aa',
        };
      case 'tired':
        return {
          emoji: '😓',
          text: '少し疲れています',
          color: '#f59e0b',
          bg: '#fed7aa',
        };
      case 'help':
        return {
          emoji: '🚨',
          text: '支援が必要です',
          color: '#ef4444',
          bg: '#fee2e2',
        };
      default:
        return {
          emoji: '❓',
          text: '状態不明',
          color: '#6b7280',
          bg: '#f3f4f6',
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f0f9ff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: 'white',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
            見守りアプリ
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {new Date().toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </div>
            <button
              onClick={() => signOut()}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
      }}>
        {/* 状態カード */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '20px',
          }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '10px',
            }}>
              {status.emoji}
            </div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: status.color,
              marginBottom: '10px',
            }}>
              {status.text}
            </h2>
            {myAlert && (
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
              }}>
                最終確認: {new Date(myAlert.first_trigger_at).toLocaleTimeString('ja-JP')}
              </div>
            )}
          </div>

          {/* アクションボタン */}
          {myAlert?.status === 'unanswered' && (
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              marginTop: '20px',
            }}>
              <button style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
              }}>
                今すぐ電話する
              </button>
              <button style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
              }}>
                LINEで確認
              </button>
            </div>
          )}
        </div>

        {/* 気象情報 */}
        {weather && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '15px',
              color: '#1f2937',
            }}>
              🌡️ 現在の気象情報
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
            }}>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>気温</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                  {weather.temp}℃
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>湿度</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                  {weather.humidity}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>暑さ指数</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                  {weather.wbgt}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>警戒レベル</div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: weather.level === '危険' ? '#ef4444' :
                         weather.level === '厳重警戒' ? '#f59e0b' :
                         weather.level === '警戒' ? '#eab308' : '#10b981',
                }}>
                  {weather.level}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 履歴 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '15px',
            color: '#1f2937',
          }}>
            📅 今週の記録
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '10px',
            textAlign: 'center',
          }}>
            {['月', '火', '水', '木', '金', '土', '日'].map((day, i) => (
              <div key={day}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>
                  {day}
                </div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: i < 3 ? '#d1fae5' : '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  fontSize: '20px',
                }}>
                  {i < 3 ? '✅' : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* クイックリンク */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '15px',
            color: '#1f2937',
          }}>
            🔗 クイックリンク
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}>
            <button
              onClick={() => router.push('/personal/profile')}
              style={{
                padding: '12px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              👤 プロフィール編集
            </button>
            <button
              onClick={() => router.push('/personal/emergency-contacts')}
              style={{
                padding: '12px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              📞 緊急連絡先
            </button>
            <button
              onClick={() => router.push('/account/subscription')}
              style={{
                padding: '12px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              💳 サブスクリプション
            </button>
            <button
              onClick={() => router.push('/personal/settings')}
              style={{
                padding: '12px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              ⚙️ 設定
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

const PersonalDashboard: React.FC = () => {
  return (
    <ProtectedRoute requiredUserType="individual">
      <PersonalDashboardContent />
    </ProtectedRoute>
  );
};

export default PersonalDashboard;