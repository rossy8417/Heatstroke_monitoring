import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { alertsApi } from '../lib/api';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ProtectedRoute } from '../components/ProtectedRoute';

export default function AlertsPage() {
  return (
    <ProtectedRoute>
      <AlertsContent />
    </ProtectedRoute>
  );
}

function AlertsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [processingAlerts, setProcessingAlerts] = useState<Set<string>>(new Set());

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['todayAlerts'],
    queryFn: alertsApi.getToday,
    refetchInterval: 30000, // 30秒ごとに更新
  });

  const { data: summary } = useQuery({
    queryKey: ['alertsSummary'],
    queryFn: alertsApi.getSummary,
    refetchInterval: 30000,
  });

  // 再コールミューテーション
  const retryMutation = useMutation({
    mutationFn: alertsApi.retry,
    onMutate: (alertId) => {
      setProcessingAlerts(prev => new Set(prev).add(alertId));
      setMessage('再コールを実行中...');
    },
    onSuccess: (data, alertId) => {
      if (data.success) {
        setMessage('✅ 再コールを開始しました');
      } else {
        setMessage(`⚠️ 再コール失敗: ${data.error || 'Twilioの設定を確認してください'}`);
      }
      queryClient.invalidateQueries({ queryKey: ['todayAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['alertsSummary'] });
      setTimeout(() => setMessage(null), 5000);
    },
    onError: (error: any, alertId) => {
      const errorMessage = error.response?.data?.error || error.message || '再コールに失敗しました';
      setMessage(`❌ エラー: ${errorMessage}`);
      console.error('Retry failed:', error);
      setTimeout(() => setMessage(null), 5000);
    },
    onSettled: (data, error, alertId) => {
      setProcessingAlerts(prev => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  });

  // ステータス更新ミューテーション
  const updateStatusMutation = useMutation({
    mutationFn: ({ alertId, status }: { alertId: string; status: string }) => 
      alertsApi.updateStatus(alertId, status),
    onMutate: ({ alertId }) => {
      setProcessingAlerts(prev => new Set(prev).add(alertId));
    },
    onSuccess: (data, { alertId, status }) => {
      const label = status === 'in_progress' ? '対応中' : getStatusLabel(status);
      setMessage(`✅ ステータスを「${label}」に更新しました`);
      queryClient.invalidateQueries({ queryKey: ['todayAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['alertsSummary'] });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error, { alertId }) => {
      setMessage('ステータス更新に失敗しました');
      console.error('Status update failed:', error);
      setTimeout(() => setMessage(null), 3000);
    },
    onSettled: (data, error, { alertId }) => {
      setProcessingAlerts(prev => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  });

  const handleRetry = (alertId: string) => {
    retryMutation.mutate(alertId);
  };

  const handleStatusUpdate = (alertId: string, status: string) => {
    updateStatusMutation.mutate({ alertId, status });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ok: 'OK',
      in_progress: '対応中',
      completed: '完了',
      escalated: 'エスカレーション済み',
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
    }}>
      {/* ナビゲーションバー */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
        marginBottom: '24px',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              ← ダッシュボード
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
          </div>
        </div>
      </div>
      
      {/* メインコンテンツ */}
      <div style={{ padding: '0 24px' }}>
      {/* ヘッダー */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '16px',
        }}>
          本日のアラート状況
        </h1>
        
        {/* サマリー */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '16px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
              {summary?.ok || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>OK</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
              {summary?.unanswered || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>未応答</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
              {summary?.tired || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>要注意</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8b5cf6' }}>
              {summary?.help || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>ヘルプ</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>
              {summary?.open || 0}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>未処理</div>
          </div>
        </div>
      </div>

      {/* メッセージ */}
      {message && (
        <div style={{
          backgroundColor: '#dbeafe',
          color: '#1e40af',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>ℹ️</span>
          {message}
        </div>
      )}

      {/* アラートリスト */}
      <div style={{
        display: 'grid',
        gap: '16px',
      }}>
        {alerts && alerts.length > 0 ? (
          alerts.map((alert: any) => (
            <div
              key={alert.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                opacity: processingAlerts.has(alert.id) ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: '12px',
              }}>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '4px',
                  }}>
                    {alert.household?.name || alert.household_name || 'Unknown'}
                  </h3>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                  }}>
                    {alert.created_at && format(new Date(alert.created_at), 'HH:mm', { locale: ja })}
                    {' • '}
                    WBGT: {alert.wbgt || '-'}°C
                    {' • '}
                    レベル: {alert.level || '-'}
                  </div>
                </div>
                <StatusBadge status={alert.status} />
              </div>

              {/* メタデータ表示 */}
              {alert.metadata && (
                <div style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  marginBottom: '12px',
                  backgroundColor: '#f9fafb',
                  padding: '8px',
                  borderRadius: '6px',
                }}>
                  {alert.metadata.attempts && (
                    <div>試行回数: {alert.metadata.attempts}回</div>
                  )}
                  {alert.metadata.lastResponseCode && (
                    <div>最終応答: {alert.metadata.lastResponseCode}</div>
                  )}
                  {alert.metadata.escalatedTo && (
                    <div>エスカレーション先: {alert.metadata.escalatedTo.join(', ')}</div>
                  )}
                </div>
              )}

              {/* アクションボタン */}
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
              }}>
                {/* 再コールボタン（未応答・要注意・エスカレーションの場合） */}
                {(alert.status === 'unanswered' || alert.status === 'tired' || alert.status === 'escalated') && (
                  <button
                    onClick={() => handleRetry(alert.id)}
                    disabled={processingAlerts.has(alert.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: processingAlerts.has(alert.id) ? 'not-allowed' : 'pointer',
                      opacity: processingAlerts.has(alert.id) ? 0.5 : 1,
                    }}
                  >
                    📞 再コール
                  </button>
                )}

                {/* 対応中ボタン */}
                {alert.status !== 'ok' && alert.status !== 'completed' && !alert.in_progress && (
                  <button
                    onClick={() => handleStatusUpdate(alert.id, 'in_progress')}
                    disabled={processingAlerts.has(alert.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: processingAlerts.has(alert.id) ? 'not-allowed' : 'pointer',
                      opacity: processingAlerts.has(alert.id) ? 0.5 : 1,
                    }}
                  >
                    ✅ 対応中にする
                  </button>
                )}

                {/* 完了ボタン */}
                {(alert.in_progress || alert.status === 'in_progress') && (
                  <button
                    onClick={() => handleStatusUpdate(alert.id, 'completed')}
                    disabled={processingAlerts.has(alert.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: processingAlerts.has(alert.id) ? 'not-allowed' : 'pointer',
                      opacity: processingAlerts.has(alert.id) ? 0.5 : 1,
                    }}
                  >
                    ✓ 完了
                  </button>
                )}

                {/* 詳細ボタン */}
                <button
                  onClick={() => router.push(`/alerts/${alert.id}`)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  詳細 →
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            color: '#6b7280',
          }}>
            本日のアラートはまだありません
          </div>
        )}
      </div>

      {/* スピナーアニメーション用のスタイル */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; fg: string; label: string }> = {
    ok: { bg: '#d1fae5', fg: '#065f46', label: 'OK' },
    unanswered: { bg: '#fee2e2', fg: '#991b1b', label: '未応答' },
    tired: { bg: '#fef3c7', fg: '#92400e', label: '要注意' },
    help: { bg: '#fde68a', fg: '#92400e', label: 'ヘルプ' },
    escalated: { bg: '#e5e7eb', fg: '#374151', label: 'エスカレ済' },
    open: { bg: '#e0e7ff', fg: '#3730a3', label: '未処理' },
    in_progress: { bg: '#dcfce7', fg: '#166534', label: '対応中' },
    completed: { bg: '#f3f4f6', fg: '#4b5563', label: '完了' },
  };
  
  const config = statusConfig[status] || { bg: '#e5e7eb', fg: '#374151', label: status };
  
  return (
    <span style={{
      backgroundColor: config.bg,
      color: config.fg,
      padding: '6px 12px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '600',
    }}>
      {config.label}
    </span>
  );
}