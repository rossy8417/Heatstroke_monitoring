import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { alertsApi } from '../lib/api';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

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

  const retryMutation = useMutation({
    mutationFn: alertsApi.retry,
    onSuccess: (data) => {
      setMessage(`再コールを送信しました`);
      queryClient.invalidateQueries({ queryKey: ['todayAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['alertsSummary'] });
    },
    onError: (error: any) => {
      setMessage(`エラー: ${error.message || 'unknown'}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => alertsApi.updateStatus(id, status),
    onSuccess: (data, variables) => {
      if (variables.status === 'in_progress') {
        setMessage('対応中を記録しました');
      } else if (variables.status === 'completed') {
        setMessage('完了を記録しました');
      }
      queryClient.invalidateQueries({ queryKey: ['todayAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['alertsSummary'] });
    },
    onError: (error: any) => {
      setMessage(`エラー: ${error.message || 'unknown'}`);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return { bg: '#d1fae5', color: '#065f46' };
      case 'unanswered': return { bg: '#fee2e2', color: '#991b1b' };
      case 'tired': return { bg: '#fed7aa', color: '#92400e' };
      case 'help': return { bg: '#ddd6fe', color: '#5b21b6' };
      case 'escalated': return { bg: '#fce7f3', color: '#831843' };
      default: return { bg: '#f3f4f6', color: '#374151' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ok': return 'OK';
      case 'unanswered': return '未応答';
      case 'tired': return '疲れ';
      case 'help': return '要支援';
      case 'escalated': return 'エスカレーション';
      case 'open': return '確認中';
      case 'in_progress': return '未応答'; // in_progressは本来statusではないので、未応答として扱う
      default: return status;
    }
  };
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>
              ← ダッシュボード
            </Link>
            <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
              本日のアラート一覧
            </h1>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {message && (
          <div style={{
            backgroundColor: '#eef7ff',
            border: '1px solid #b6dbff',
            padding: '12px 16px',
            marginBottom: '24px',
            borderRadius: '6px',
          }}>
            {message}
          </div>
        )}

        {/* KPIカード */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #10b981',
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>OK</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>{summary?.ok || 0}</div>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #ef4444',
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>未応答</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#ef4444' }}>{summary?.unanswered || 0}</div>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #f59e0b',
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>疲れ</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{summary?.tired || 0}</div>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #8b5cf6',
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>要支援</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#8b5cf6' }}>{summary?.help || 0}</div>
          </div>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #ec4899',
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>エスカレーション</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#ec4899' }}>{summary?.escalated || 0}</div>
          </div>
        </div>

        {/* アラートリスト */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              読み込み中...
            </div>
          ) : alerts && alerts.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>時刻</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>世帯名</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>電話番号</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>ステータス</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>WBGT</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>レベル</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert: any) => {
                    const statusStyle = getStatusColor(alert.status);
                    const alertTime = new Date(alert.first_trigger_at || alert.created_at);
                    const minutesAgo = Math.floor((Date.now() - alertTime.getTime()) / 60000);
                    
                    return (
                      <tr key={alert.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          {alertTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {minutesAgo}分前
                          </div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>
                          {alert.household?.name || '不明'}
                          {alert.household?.risk_flag && (
                            <span style={{
                              marginLeft: '8px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                            }}>
                              高リスク
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          {alert.household?.phone || '-'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                          }}>
                            {getStatusLabel(alert.status)}
                          </span>
                          {alert.in_progress && (
                            <span style={{
                              marginLeft: '8px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              backgroundColor: '#fff5da',
                              border: '1px solid #ffd26e',
                              color: '#8a6d1b',
                            }}>
                              対応中
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          {alert.wbgt}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          <span style={{
                            color: alert.level === '危険' ? '#ef4444' :
                                   alert.level === '厳重警戒' ? '#f59e0b' :
                                   alert.level === '警戒' ? '#eab308' : '#10b981',
                            fontWeight: '500',
                          }}>
                            {alert.level}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {alert.status === 'unanswered' && (
                              <button
                                onClick={() => retryMutation.mutate(alert.id)}
                                disabled={retryMutation.isPending}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  opacity: retryMutation.isPending ? 0.5 : 1,
                                }}
                              >
                                再コール
                              </button>
                            )}
                            {!alert.in_progress && alert.status !== 'ok' && alert.status !== 'escalated' && (
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: alert.id, status: 'in_progress' })}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#f59e0b',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                }}
                              >
                                対応中
                              </button>
                            )}
                            {alert.in_progress && (
                              <button
                                onClick={() => updateStatusMutation.mutate({ id: alert.id, status: 'ok' })}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                }}
                              >
                                完了
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              本日のアラートはまだありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
