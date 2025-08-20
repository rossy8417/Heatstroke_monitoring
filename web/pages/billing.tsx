import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';

interface Plan {
  id: string;
  name: string;
  type: 'personal' | 'family' | 'business';
  price: number;
  currency: string;
  interval: 'month' | 'year';
  max_households: number;
  max_contacts: number;
  features: string[];
  recommended?: boolean;
}

interface Subscription {
  id: string;
  type: 'personal' | 'family' | 'business';
  status: 'active' | 'inactive' | 'cancelled';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  price: number;
  currency: string;
  max_households: number;
  max_contacts: number;
}

function BillingContent() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // 利用可能なプラン取得
  const { data: plans } = useQuery({
    queryKey: ['availablePlans'],
    queryFn: async () => {
      const response = await fetch('/api/billing/plans');
      if (!response.ok) throw new Error('Failed to fetch plans');
      return response.json();
    },
  });

  // 現在のサブスクリプション取得
  const { data: currentSubscription, isLoading } = useQuery({
    queryKey: ['currentSubscription'],
    queryFn: async () => {
      const response = await fetch('/api/user/subscription', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch subscription');
      return response.json() as Subscription;
    },
    enabled: !!user,
  });

  // ユーザーの世帯情報取得
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

  // プラン変更ミューテーション
  const updatePlanMutation = useMutation({
    mutationFn: async (planType: string) => {
      const response = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify({ planType }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update plan');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
      setSelectedPlan(null);
      setIsUpgrading(false);
      alert('プランが正常に変更されました！');
    },
    onError: (error: any) => {
      alert(`プラン変更に失敗しました: ${error.message}`);
      setIsUpgrading(false);
    }
  });

  // サブスクリプションキャンセルミューテーション
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
      alert('サブスクリプションのキャンセル予約が完了しました。現在の請求期間終了時にキャンセルされます。');
    }
  });

  const handlePlanChange = async (planType: string) => {
    if (!selectedPlan) return;
    
    const plan = plans?.find((p: Plan) => p.type === planType);
    if (!plan) return;

    // ダウングレード時の確認
    if (currentSubscription && userHouseholds) {
      const currentHouseholds = userHouseholds.length;
      const newMaxHouseholds = plan.max_households;
      
      if (newMaxHouseholds > 0 && currentHouseholds > newMaxHouseholds) {
        const confirmDowngrade = confirm(
          `現在${currentHouseholds}世帯を管理していますが、${plan.name}プランでは${newMaxHouseholds}世帯まで制限されます。\n` +
          `${currentHouseholds - newMaxHouseholds}世帯の管理ができなくなりますが、続行しますか？`
        );
        if (!confirmDowngrade) return;
      }
    }

    setIsUpgrading(true);
    updatePlanMutation.mutate(planType);
  };

  const getPlanColor = (type: string) => {
    switch (type) {
      case 'personal': return '#6b7280';
      case 'family': return '#3b82f6';
      case 'business': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPlanDisplayName = (type: string) => {
    switch (type) {
      case 'personal': return 'パーソナル';
      case 'family': return 'ファミリー';
      case 'business': return 'ビジネス';
      default: return '不明';
    }
  };

  const getFeatureList = (type: string) => {
    const features = {
      personal: [
        '1世帯まで管理',
        '基本的なアラート機能',
        '3件まで緊急連絡先',
        'メール・SMS通知',
        '基本サポート'
      ],
      family: [
        '3世帯まで管理',
        '高度なアラート分析',
        '10件まで緊急連絡先',
        'LINE通知対応',
        'カスタムアラート設定',
        '優先サポート'
      ],
      business: [
        '無制限の世帯管理',
        '全機能利用可能',
        '無制限の緊急連絡先',
        'API アクセス',
        'データエクスポート',
        'ユーザー管理機能',
        '24時間サポート',
        'SLA保証'
      ]
    };
    return features[type] || [];
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
          <div>サブスクリプション情報を取得中...</div>
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
              💳 プラン・請求管理
            </h1>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* 現在のプラン情報 */}
        {currentSubscription && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: `2px solid ${getPlanColor(currentSubscription.type)}`
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              現在のプラン
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>プラン</div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  <div style={{
                    backgroundColor: getPlanColor(currentSubscription.type),
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {getPlanDisplayName(currentSubscription.type)}
                  </div>
                  <span style={{ color: currentSubscription.status === 'active' ? '#10b981' : '#ef4444' }}>
                    {currentSubscription.status === 'active' ? 'アクティブ' : '非アクティブ'}
                  </span>
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>月額料金</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>
                  ¥{currentSubscription.price.toLocaleString()}/月
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>利用状況</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>
                  {userHouseholds?.length || 0}/{currentSubscription.max_households === 0 ? '無制限' : currentSubscription.max_households} 世帯
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>次回請求日</div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>
                  {new Date(currentSubscription.current_period_end).toLocaleDateString('ja-JP')}
                </div>
              </div>
            </div>

            {currentSubscription.cancel_at_period_end && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#fef3c7',
                borderRadius: '6px',
                border: '1px solid #fbbf24'
              }}>
                <div style={{ fontSize: '14px', color: '#92400e', fontWeight: '500' }}>
                  ⚠️ このサブスクリプションは{new Date(currentSubscription.current_period_end).toLocaleDateString('ja-JP')}にキャンセルされます
                </div>
              </div>
            )}
          </div>
        )}

        {/* プラン選択 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>
            利用可能なプラン
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {['personal', 'family', 'business'].map((planType) => {
              const plan = plans?.find((p: Plan) => p.type === planType) || {
                type: planType,
                name: getPlanDisplayName(planType),
                price: planType === 'personal' ? 980 : planType === 'family' ? 2980 : 9800,
                max_households: planType === 'personal' ? 1 : planType === 'family' ? 3 : 0,
                max_contacts: planType === 'personal' ? 3 : planType === 'family' ? 10 : 0
              };

              const isCurrentPlan = currentSubscription?.type === planType;
              const features = getFeatureList(planType);

              return (
                <div
                  key={planType}
                  style={{
                    border: `2px solid ${isCurrentPlan ? getPlanColor(planType) : '#e5e7eb'}`,
                    borderRadius: '12px',
                    padding: '24px',
                    backgroundColor: isCurrentPlan ? '#f9fafb' : 'white',
                    position: 'relative'
                  }}
                >
                  {planType === 'family' && (
                    <div style={{
                      position: 'absolute',
                      top: '-10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '4px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      おすすめ
                    </div>
                  )}

                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      margin: '0 0 8px 0',
                      color: getPlanColor(planType)
                    }}>
                      {plan.name}
                    </h3>
                    <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
                      ¥{plan.price.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      /月（税込）
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
                      機能・制限
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {features.map((feature, index) => (
                        <li key={index} style={{
                          padding: '4px 0',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{ color: '#10b981', fontWeight: '600' }}>✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      if (isCurrentPlan) return;
                      setSelectedPlan(planType);
                      handlePlanChange(planType);
                    }}
                    disabled={isCurrentPlan || isUpgrading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: isCurrentPlan ? '#e5e7eb' : getPlanColor(planType),
                      color: isCurrentPlan ? '#6b7280' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: isCurrentPlan || isUpgrading ? 'not-allowed' : 'pointer',
                      opacity: isUpgrading && selectedPlan === planType ? 0.7 : 1
                    }}
                  >
                    {isCurrentPlan ? '現在のプラン' :
                     isUpgrading && selectedPlan === planType ? '変更中...' :
                     currentSubscription && currentSubscription.type !== 'personal' && planType === 'personal' ? 'ダウングレード' :
                     'このプランに変更'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 請求履歴・管理オプション */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>
            請求管理
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <button
              onClick={() => alert('請求履歴機能（実装予定）')}
              style={{
                padding: '16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                📄 請求履歴
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                過去の請求書を確認
              </div>
            </button>

            <button
              onClick={() => alert('支払い方法変更機能（実装予定）')}
              style={{
                padding: '16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px' }}>
                💳 支払い方法
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
                クレジットカード情報を変更
              </div>
            </button>

            {currentSubscription && !currentSubscription.cancel_at_period_end && (
              <button
                onClick={() => {
                  if (confirm('サブスクリプションをキャンセルしますか？現在の請求期間終了時にキャンセルされます。')) {
                    cancelSubscriptionMutation.mutate();
                  }
                }}
                style={{
                  padding: '16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '4px', color: '#ef4444' }}>
                  ❌ サブスクリプションをキャンセル
                </div>
                <div style={{ fontSize: '14px', color: '#ef4444' }}>
                  現在の期間終了時にキャンセル
                </div>
              </button>
            )}
          </div>
        </div>

        {/* 注意事項 */}
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px'
        }}>
          <div style={{ fontSize: '14px', color: '#0c4a6e', fontWeight: '500', marginBottom: '8px' }}>
            📋 プラン変更について
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#0c4a6e', fontSize: '14px' }}>
            <li>プラン変更は即座に反映されます</li>
            <li>アップグレード時は日割り計算で差額を請求します</li>
            <li>ダウングレード時は次回請求時から新料金が適用されます</li>
            <li>制限を超える世帯がある場合、ダウングレード前に調整が必要です</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Billing() {
  return (
    <ProtectedRoute>
      <BillingContent />
    </ProtectedRoute>
  );
}