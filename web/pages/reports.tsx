import { useRouter } from 'next/router';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

function ReportsContent() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  // ダミーデータ
  const monthlyData = {
    totalAlerts: 145,
    responseRate: 85,
    averageResponseTime: '2分30秒',
    byStatus: {
      ok: 123,
      unanswered: 8,
      tired: 10,
      help: 2,
      escalated: 2
    }
  };

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
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
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
            <h1 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827',
              margin: 0,
            }}>
              レポート
            </h1>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        {/* 月次サマリー */}
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
            color: '#111827',
            marginBottom: '20px',
          }}>
            {format(new Date(selectedMonth), 'yyyy年MM月', { locale: ja })}の概要
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
          }}>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                総アラート数
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                {monthlyData.totalAlerts}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                応答率
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                {monthlyData.responseRate}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                平均応答時間
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
                {monthlyData.averageResponseTime}
              </div>
            </div>
          </div>
        </div>

        {/* ステータス別内訳 */}
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
            color: '#111827',
            marginBottom: '20px',
          }}>
            ステータス別内訳
          </h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    ステータス
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    件数
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    割合
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px', marginRight: '8px' }}></span>
                    OK（正常応答）
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                    {monthlyData.byStatus.ok}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                    {Math.round((monthlyData.byStatus.ok / monthlyData.totalAlerts) * 100)}%
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px', marginRight: '8px' }}></span>
                    未応答
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                    {monthlyData.byStatus.unanswered}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                    {Math.round((monthlyData.byStatus.unanswered / monthlyData.totalAlerts) * 100)}%
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px', marginRight: '8px' }}></span>
                    要注意
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                    {monthlyData.byStatus.tired}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                    {Math.round((monthlyData.byStatus.tired / monthlyData.totalAlerts) * 100)}%
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#8b5cf6', borderRadius: '2px', marginRight: '8px' }}></span>
                    要支援
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                    {monthlyData.byStatus.help}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                    {Math.round((monthlyData.byStatus.help / monthlyData.totalAlerts) * 100)}%
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '12px', fontSize: '14px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#ec4899', borderRadius: '2px', marginRight: '8px' }}></span>
                    エスカレーション
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                    {monthlyData.byStatus.escalated}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                    {Math.round((monthlyData.byStatus.escalated / monthlyData.totalAlerts) * 100)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* エクスポートボタン */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '20px',
          }}>
            データエクスポート
          </h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              style={{
                padding: '10px 20px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
              onClick={() => alert('CSV形式でダウンロード（実装予定）')}
            >
              CSVダウンロード
            </button>
            <button
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
              onClick={() => alert('PDF形式でダウンロード（実装予定）')}
            >
              PDFダウンロード
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  );
}