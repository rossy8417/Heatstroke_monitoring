import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { alertsApi } from '../../lib/api';

export default function AlertDetailPage() {
  return (
    <ProtectedRoute>
      <AlertDetailContent />
    </ProtectedRoute>
  );
}

function AlertDetailContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = router.query;
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // アラート詳細データの取得
  const { data: alert, isLoading, error } = useQuery({
    queryKey: ['alert', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await alertsApi.getDetail(id as string);
      return response;
    },
    enabled: !!id,
    refetchInterval: 30000, // 30秒ごとに更新
  });

  // 再コールミューテーション
  const retryMutation = useMutation({
    mutationFn: () => alertsApi.retry(id as string),
    onMutate: () => {
      setIsProcessing(true);
      setMessage('再コールを実行中...');
    },
    onSuccess: (data) => {
      if (data.success) {
        setMessage('✅ 再コールを開始しました');
      } else {
        setMessage(`⚠️ 再コール失敗: ${data.error || 'Twilioの設定を確認してください'}`);
      }
      queryClient.invalidateQueries({ queryKey: ['alert', id] });
      setTimeout(() => setMessage(null), 5000);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.message || '再コールに失敗しました';
      setMessage(`❌ エラー: ${errorMessage}`);
      console.error('Retry failed:', error);
      setTimeout(() => setMessage(null), 5000);
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  // ステータス更新ミューテーション
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => alertsApi.updateStatus(id as string, status),
    onMutate: () => {
      setIsProcessing(true);
    },
    onSuccess: (data, status) => {
      const label = getStatusLabel(status);
      setMessage(`✅ ステータスを「${label}」に更新しました`);
      queryClient.invalidateQueries({ queryKey: ['alert', id] });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error) => {
      setMessage('ステータス更新に失敗しました');
      console.error('Status update failed:', error);
      setTimeout(() => setMessage(null), 3000);
    },
    onSettled: () => {
      setIsProcessing(false);
    }
  });

  const handleRetry = () => {
    retryMutation.mutate();
  };

  const handleStatusUpdate = (status: string) => {
    updateStatusMutation.mutate(status);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ok: 'OK',
      unanswered: '未応答',
      tired: '要注意',
      help: 'ヘルプ',
      escalated: 'エスカレーション済み',
      in_progress: '対応中',
      completed: '完了',
    };
    return labels[status] || status;
  };

  const getTimelineIcon = (type: string) => {
    const icons: Record<string, string> = {
      alert_created: '🔔',
      call: '📞',
      notification: '💬',
      alert_closed: '✅',
    };
    return icons[type] || '📝';
  };

  if (!id) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            border: '2px solid #3b82f6', 
            borderTopColor: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite' 
          }} />
          読み込み中...
        </div>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '24px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          color: '#ef4444'
        }}>
          アラート情報の取得に失敗しました
          <button
            onClick={() => router.push('/alerts')}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            アラート一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  const alertData = alert.data || alert;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
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
          <button
            onClick={() => router.push('/alerts')}
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
            ← アラート一覧に戻る
          </button>
        </div>
      </div>

      <div style={{ padding: '0 24px', maxWidth: '1200px', margin: '0 auto' }}>
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

        {/* アラート基本情報 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            marginBottom: '20px',
          }}>
            <div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '8px',
              }}>
                {alertData.household?.name || alertData.household_name || 'Unknown'}
              </h1>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                ID: {alertData.id}
              </div>
            </div>
            <StatusBadge status={alertData.status} />
          </div>

          {/* 詳細情報グリッド */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}>
            <InfoItem label="発生時刻" value={
              alertData.created_at ? 
              format(new Date(alertData.created_at), 'yyyy/MM/dd HH:mm:ss', { locale: ja }) : 
              '-'
            } />
            <InfoItem label="WBGT" value={`${alertData.wbgt || '-'}°C`} />
            <InfoItem label="警戒レベル" value={alertData.level || '-'} />
            <InfoItem label="電話番号" value={alertData.household?.phone || '-'} />
            <InfoItem label="住所" value={alertData.household?.address || '-'} />
            <InfoItem label="更新日時" value={
              alertData.updated_at ? 
              format(new Date(alertData.updated_at), 'yyyy/MM/dd HH:mm:ss', { locale: ja }) : 
              '-'
            } />
          </div>

          {/* アクションボタン */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* 再コールボタン */}
            {(alertData.status === 'unanswered' || alertData.status === 'tired' || alertData.status === 'escalated') && (
              <button
                onClick={handleRetry}
                disabled={isProcessing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.5 : 1,
                }}
              >
                📞 再コール
              </button>
            )}

            {/* 対応中ボタン */}
            {alertData.status !== 'ok' && alertData.status !== 'completed' && !alertData.in_progress && (
              <button
                onClick={() => handleStatusUpdate('in_progress')}
                disabled={isProcessing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.5 : 1,
                }}
              >
                ✅ 対応中にする
              </button>
            )}

            {/* 完了ボタン */}
            {(alertData.in_progress || alertData.status === 'in_progress') && (
              <button
                onClick={() => handleStatusUpdate('completed')}
                disabled={isProcessing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.5 : 1,
                }}
              >
                ✓ 完了
              </button>
            )}
          </div>
        </div>

        {/* 通話履歴 */}
        {alertData.callLogs && alertData.callLogs.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '16px',
            }}>
              通話履歴
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alertData.callLogs.map((log: any, index: number) => (
                <div
                  key={log.id || index}
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: '12px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                      試行 {log.attempt || index + 1}回目
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {log.created_at && format(new Date(log.created_at), 'HH:mm:ss', { locale: ja })}
                      {log.duration_sec && ` • ${log.duration_sec}秒`}
                    </div>
                  </div>
                  <CallStatusBadge status={log.result} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* タイムライン */}
        {alertData.timeline && alertData.timeline.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '16px',
            }}>
              タイムライン
            </h2>
            <div style={{ position: 'relative' }}>
              {/* 垂直線 */}
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '20px',
                bottom: '20px',
                width: '2px',
                backgroundColor: '#e5e7eb',
              }} />
              
              {/* イベント */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {alertData.timeline.map((event: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'start',
                    }}
                  >
                    {/* アイコン */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      border: '2px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0,
                      zIndex: 1,
                    }}>
                      {getTimelineIcon(event.type)}
                    </div>
                    
                    {/* コンテンツ */}
                    <div style={{ flex: 1, paddingTop: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                        {event.description}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        {event.timestamp && format(new Date(event.timestamp), 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
                        {event.timestamp && (
                          <span style={{ marginLeft: '8px' }}>
                            ({formatDistanceToNow(new Date(event.timestamp), { locale: ja, addSuffix: true })})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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

// 情報項目コンポーネント
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
        {value}
      </div>
    </div>
  );
}

// ステータスバッジコンポーネント
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
      padding: '8px 16px',
      borderRadius: '999px',
      fontSize: '14px',
      fontWeight: '600',
    }}>
      {config.label}
    </span>
  );
}

// 通話ステータスバッジコンポーネント
function CallStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; fg: string; label: string }> = {
    ok: { bg: '#d1fae5', fg: '#065f46', label: '応答' },
    noanswer: { bg: '#fee2e2', fg: '#991b1b', label: '未応答' },
    busy: { bg: '#fef3c7', fg: '#92400e', label: '話中' },
    failed: { bg: '#fee2e2', fg: '#991b1b', label: '失敗' },
    pending: { bg: '#e0e7ff', fg: '#3730a3', label: '処理中' },
  };
  
  const config = statusConfig[status] || { bg: '#e5e7eb', fg: '#374151', label: status };
  
  return (
    <span style={{
      backgroundColor: config.bg,
      color: config.fg,
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
    }}>
      {config.label}
    </span>
  );
}