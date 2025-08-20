import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  subscription?: {
    type: 'personal' | 'family' | 'business';
    status: 'active' | 'inactive' | 'cancelled';
  };
  households_count: number;
  last_login_at?: string;
}

function UserManagementContent() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // ユーザー一覧取得（ビジネスプラン限定機能）
  const { data: users, isLoading } = useQuery({
    queryKey: ['adminUsers', searchQuery, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    },
    enabled: !!user,
  });

  // ユーザーサブスクリプション更新
  const updateUserSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, subscriptionType }: { userId: string; subscriptionType: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify({ type: subscriptionType }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: { backgroundColor: '#d1fae5', color: '#065f46' },
      inactive: { backgroundColor: '#fee2e2', color: '#991b1b' },
      cancelled: { backgroundColor: '#f3f4f6', color: '#374151' },
    };

    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        ...styles[status] || styles.inactive
      }}>
        {status === 'active' ? 'アクティブ' : 
         status === 'inactive' ? '非アクティブ' : 
         status === 'cancelled' ? 'キャンセル済み' : status}
      </span>
    );
  };

  const getPlanBadge = (type: string) => {
    const styles = {
      personal: { backgroundColor: '#f3f4f6', color: '#374151' },
      family: { backgroundColor: '#dbeafe', color: '#1e40af' },
      business: { backgroundColor: '#d1fae5', color: '#065f46' },
    };

    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        ...styles[type] || styles.personal
      }}>
        {type === 'personal' ? 'パーソナル' : 
         type === 'family' ? 'ファミリー' : 
         type === 'business' ? 'ビジネス' : type}
      </span>
    );
  };

  if (isLoading) {
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
          <div>ユーザー情報を取得中...</div>
        </div>
      </div>
    );
  }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
              🔧 ユーザー管理
            </h1>
            <div style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              ビジネスプラン限定
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* 検索・フィルター */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                placeholder="ユーザー名、メールアドレスで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="all">全ステータス</option>
                <option value="active">アクティブ</option>
                <option value="inactive">非アクティブ</option>
              </select>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>総ユーザー数</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>
              {users?.total || 0}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>アクティブユーザー</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#10b981' }}>
              {users?.active || 0}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>ビジネスプラン</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#3b82f6' }}>
              {users?.business || 0}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>総世帯数</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#f59e0b' }}>
              {users?.total_households || 0}
            </div>
          </div>
        </div>

        {/* ユーザーテーブル */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              ユーザー一覧
            </h2>
          </div>

          {users?.data && users.data.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>ユーザー</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>プラン</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>ステータス</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>世帯数</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>登録日</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>最終ログイン</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.map((userData: User) => (
                    <tr key={userData.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '500' }}>{userData.name || 'No Name'}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{userData.email}</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {userData.subscription ? getPlanBadge(userData.subscription.type) : '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {userData.subscription ? getStatusBadge(userData.subscription.status) : '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {userData.households_count}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {new Date(userData.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {userData.last_login_at 
                          ? new Date(userData.last_login_at).toLocaleDateString('ja-JP')
                          : '未ログイン'
                        }
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => router.push(`/admin/users/${userData.id}`)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                            }}
                          >
                            詳細
                          </button>
                          
                          {userData.subscription && (
                            <select
                              value={userData.subscription.type}
                              onChange={(e) => {
                                if (confirm(`${userData.email}のプランを${e.target.value}に変更しますか？`)) {
                                  updateUserSubscriptionMutation.mutate({
                                    userId: userData.id,
                                    subscriptionType: e.target.value
                                  });
                                }
                              }}
                              style={{
                                padding: '4px 6px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: 'white'
                              }}
                            >
                              <option value="personal">パーソナル</option>
                              <option value="family">ファミリー</option>
                              <option value="business">ビジネス</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              ユーザーが見つかりません
            </div>
          )}
        </div>

        {/* 管理者向け警告 */}
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#92400e', fontWeight: '500', marginBottom: '8px' }}>
            ⚠️ 管理者向け機能
          </div>
          <div style={{ fontSize: '14px', color: '#92400e' }}>
            この機能はビジネスプラン限定です。ユーザーのプラン変更は慎重に行ってください。
            変更は即座に反映され、ユーザーの利用可能機能に影響します。
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  return (
    <ProtectedRoute>
      <UserManagementContent />
    </ProtectedRoute>
  );
}