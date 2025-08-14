import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { getPlanById } from '../../lib/subscription-plans';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function SubscriptionContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/subscription/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: subscription.stripe_customer_id,
        }),
      });

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to create portal session:', error);
      alert('エラーが発生しました');
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('本当にサブスクリプションをキャンセルしますか？')) {
      return;
    }

    setCancelLoading(true);

    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
        }),
      });

      if (response.ok) {
        alert('サブスクリプションをキャンセルしました。期間終了まではご利用いただけます。');
        fetchSubscription();
      } else {
        alert('キャンセルに失敗しました');
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('エラーが発生しました');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
      }}>
        <div>読み込み中...</div>
      </div>
    );
  }

  const plan = subscription ? getPlanById(subscription.plan_id) : null;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        {/* ヘッダー */}
        <div style={{
          marginBottom: '40px',
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '20px',
              padding: 0,
            }}
          >
            ← 戻る
          </button>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#1f2937',
          }}>
            サブスクリプション管理
          </h1>
        </div>

        {/* 現在のプラン */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '20px',
          }}>
            現在のプラン
          </h2>

          {plan ? (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                marginBottom: '20px',
              }}>
                <div>
                  <h3 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: '8px',
                  }}>
                    {plan.name}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                  }}>
                    {plan.description}
                  </p>
                </div>
                <div style={{
                  textAlign: 'right',
                }}>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                  }}>
                    ¥{plan.price.toLocaleString()}
                    <span style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      fontWeight: 'normal',
                    }}>
                      /月
                    </span>
                  </div>
                  {subscription.status === 'active' ? (
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      backgroundColor: '#d1fae5',
                      color: '#065f46',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      marginTop: '8px',
                    }}>
                      アクティブ
                    </span>
                  ) : subscription.status === 'canceled' ? (
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      marginTop: '8px',
                    }}>
                      キャンセル済み
                    </span>
                  ) : null}
                </div>
              </div>

              {/* 次回請求日 */}
              {subscription.current_period_end && (
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                }}>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                  }}>
                    {subscription.status === 'canceled' ? '利用期限' : '次回請求日'}：
                    <strong style={{ color: '#1f2937', marginLeft: '8px' }}>
                      {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
                    </strong>
                  </p>
                </div>
              )}

              {/* アクション */}
              <div style={{
                display: 'flex',
                gap: '12px',
              }}>
                <button
                  onClick={() => router.push('/pricing')}
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
                >
                  プランを変更
                </button>
                <button
                  onClick={handleManageBilling}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  請求情報を管理
                </button>
                {subscription.status === 'active' && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'white',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: cancelLoading ? 'not-allowed' : 'pointer',
                      opacity: cancelLoading ? 0.5 : 1,
                    }}
                  >
                    {cancelLoading ? 'キャンセル中...' : 'キャンセル'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div>
              <p style={{
                fontSize: '16px',
                color: '#6b7280',
                marginBottom: '20px',
              }}>
                現在、無料プランをご利用中です
              </p>
              <button
                onClick={() => router.push('/pricing')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                有料プランにアップグレード
              </button>
            </div>
          )}
        </div>

        {/* 支払い履歴 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '20px',
          }}>
            支払い履歴
          </h2>

          {/* TODO: 実際の支払い履歴を表示 */}
          <div style={{
            color: '#6b7280',
            fontSize: '14px',
          }}>
            支払い履歴はまだありません
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <ProtectedRoute>
      <SubscriptionContent />
    </ProtectedRoute>
  );
}