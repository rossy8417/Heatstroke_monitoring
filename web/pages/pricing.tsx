import React from 'react';
import { useRouter } from 'next/router';
import { SUBSCRIPTION_PLANS } from '../lib/subscription-plans';

/**
 * 料金プランページ
 * すべてのプランを一覧表示
 */
const PricingPage: React.FC = () => {
  const router = useRouter();
  
  // エンタープライズ以外のプランをすべて取得
  const displayPlans = SUBSCRIPTION_PLANS.filter(plan => plan.id !== 'enterprise');

  const handleSelectPlan = async (planId: string, stripePriceId?: string) => {
    if (planId === 'free') {
      // 無料プランは直接登録
      router.push('/register?plan=free');
    } else if (stripePriceId) {
      // 有料プランはStripe決済へ
      try {
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId: stripePriceId,
            planId: planId,
          }),
        });

        const { sessionId, url } = await response.json();
        
        if (url) {
          // Stripe Checkoutへリダイレクト
          window.location.href = url;
        }
      } catch (error) {
        console.error('Checkout error:', error);
        alert('決済の開始に失敗しました。もう一度お試しください。');
      }
    }
  };

  // プランのカテゴリーラベル
  const getCategoryLabel = (userType: string) => {
    switch (userType) {
      case 'individual':
        return '個人・家族向け';
      case 'community':
        return '町内会・自治会向け';
      case 'business':
        return '介護施設・事業者向け';
      default:
        return '';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingTop: '40px',
      paddingBottom: '80px',
    }}>
      {/* ヘッダー */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '16px',
        }}>
          料金プラン
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#6b7280',
          maxWidth: '600px',
          margin: '0 auto',
        }}>
          あなたのニーズに合わせたプランをお選びください。
          いつでもプラン変更・解約が可能です。
        </p>
      </div>

      {/* 年額割引バナー */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
      }}>
        <span style={{
          backgroundColor: '#fef3c7',
          color: '#92400e',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500',
        }}>
          🎉 年額プランなら2ヶ月分お得！
        </span>
      </div>

      {/* プランカード */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        padding: '0 20px',
      }}>
        {displayPlans.map((plan) => {
          // おすすめプランの判定
          const isPopular = plan.id === 'family' || plan.id === 'community-standard' || plan.id === 'business-pro';

          return (
            <div
              key={plan.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: isPopular ? '0 10px 25px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.1)',
                border: isPopular ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* カテゴリーラベル */}
              <div style={{
                fontSize: '11px',
                color: '#9ca3af',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}>
                {getCategoryLabel(plan.userType)}
              </div>

              {/* 人気バッジ */}
              {isPopular && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '3px 12px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}>
                  人気
                </div>
              )}

              {/* プラン名 */}
              <h3 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '6px',
              }}>
                {plan.name}
              </h3>

              {/* 説明 */}
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                marginBottom: '16px',
                minHeight: '32px',
              }}>
                {plan.description}
              </p>

              {/* 価格 */}
              <div style={{
                marginBottom: '20px',
              }}>
                <span style={{
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                }}>
                  ¥{plan.price.toLocaleString()}
                </span>
                <span style={{
                  fontSize: '14px',
                  color: '#6b7280',
                }}>
                  /月
                </span>
              </div>

              {/* 主要機能リスト */}
              <ul style={{
                listStyle: 'none',
                padding: 0,
                marginBottom: '20px',
                flex: 1,
              }}>
                {/* 世帯数 */}
                <li style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px',
                  fontSize: '13px',
                  color: '#374151',
                }}>
                  <span style={{
                    color: '#10b981',
                    marginRight: '6px',
                    fontSize: '14px',
                  }}>
                    ✓
                  </span>
                  {plan.features.maxHouseholds}世帯まで
                </li>
                
                {/* アラート数 */}
                <li style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px',
                  fontSize: '13px',
                  color: '#374151',
                }}>
                  <span style={{
                    color: '#10b981',
                    marginRight: '6px',
                    fontSize: '14px',
                  }}>
                    ✓
                  </span>
                  1日{plan.features.maxAlerts}件
                </li>

                {/* 通知方法 */}
                <li style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px',
                  fontSize: '13px',
                  color: '#374151',
                }}>
                  <span style={{
                    color: '#10b981',
                    marginRight: '6px',
                    fontSize: '14px',
                  }}>
                    ✓
                  </span>
                  {[
                    plan.features.lineNotifications && 'LINE',
                    plan.features.smsNotifications && 'SMS',
                    plan.features.voiceCalls && '音声',
                  ].filter(Boolean).join('・')}通知
                </li>

                {/* サポート */}
                <li style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '10px',
                  fontSize: '13px',
                  color: '#374151',
                }}>
                  <span style={{
                    color: '#10b981',
                    marginRight: '6px',
                    fontSize: '14px',
                  }}>
                    ✓
                  </span>
                  {plan.features.support === 'priority' && '優先'}
                  {plan.features.support === 'email' && 'メール'}
                  {plan.features.support === 'community' && 'コミュニティ'}
                  サポート
                </li>

                {/* その他の特徴 */}
                {plan.features.reports && (
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                    fontSize: '13px',
                    color: '#374151',
                  }}>
                    <span style={{
                      color: '#10b981',
                      marginRight: '6px',
                      fontSize: '14px',
                    }}>
                      ✓
                    </span>
                    レポート機能
                  </li>
                )}
                {plan.features.apiAccess && (
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                    fontSize: '13px',
                    color: '#374151',
                  }}>
                    <span style={{
                      color: '#10b981',
                      marginRight: '6px',
                      fontSize: '14px',
                    }}>
                      ✓
                    </span>
                    API連携
                  </li>
                )}
              </ul>

              {/* CTAボタン */}
              <button
                onClick={() => handleSelectPlan(plan.id, plan.stripePriceId)}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: plan.id === 'free' ? 'white' : '#3b82f6',
                  color: plan.id === 'free' ? '#3b82f6' : 'white',
                  border: plan.id === 'free' ? '2px solid #3b82f6' : 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (plan.id !== 'free') {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (plan.id !== 'free') {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                {plan.id === 'free' ? '無料で始める' : '申し込む'}
              </button>
            </div>
          );
        })}
      </div>

      {/* エンタープライズプラン */}
      <div style={{
        maxWidth: '800px',
        margin: '60px auto 0',
        padding: '0 20px',
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '16px',
          }}>
            🏢 エンタープライズプラン
          </h3>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '24px',
            lineHeight: '1.6',
          }}>
            50世帯以上の大規模導入や、カスタマイズが必要な場合はお問い合わせください。<br />
            お客様のニーズに合わせた最適なプランをご提案いたします。
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            flexWrap: 'wrap',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontSize: '16px' }}>✓</span>
              <span style={{ fontSize: '14px', color: '#374151' }}>無制限の世帯数</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontSize: '16px' }}>✓</span>
              <span style={{ fontSize: '14px', color: '#374151' }}>専任サポート</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontSize: '16px' }}>✓</span>
              <span style={{ fontSize: '14px', color: '#374151' }}>カスタマイズ対応</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/contact?plan=enterprise')}
            style={{
              padding: '12px 32px',
              backgroundColor: '#1f2937',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1f2937';
            }}
          >
            お問い合わせ
          </button>
        </div>
      </div>

      {/* FAQ */}
      <div style={{
        maxWidth: '800px',
        margin: '60px auto 0',
        padding: '0 20px',
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          よくある質問
        </h2>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              どのプランを選べばよいですか？
            </h4>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              個人・家族の見守りならパーソナルまたはファミリープラン、
              町内会・自治会ならコミュニティプラン、
              介護施設・事業者様ならビジネスプランがおすすめです。
            </p>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              プランはいつでも変更できますか？
            </h4>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              はい、いつでもアップグレード・ダウングレードが可能です。日割り計算で調整されます。
            </p>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              解約はいつでもできますか？
            </h4>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              はい、いつでも解約可能です。解約後も期間終了まではご利用いただけます。
            </p>
          </div>
          <div>
            <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              支払い方法は？
            </h4>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              クレジットカード（Visa, Mastercard, JCB, AMEX）でのお支払いが可能です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;