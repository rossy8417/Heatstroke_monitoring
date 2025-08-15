import React from 'react';
import { useRouter } from 'next/router';
import { SUBSCRIPTION_PLANS } from '../../lib/subscription-plans';

/**
 * 法人・団体向け料金プランページ
 */
const BusinessPricingPage: React.FC = () => {
  const router = useRouter();
  
  // コミュニティプランとビジネスプランを取得
  const communityPlans = SUBSCRIPTION_PLANS.filter(plan => plan.userType === 'community');
  const businessPlans = SUBSCRIPTION_PLANS.filter(
    plan => plan.userType === 'business' && plan.id !== 'enterprise'
  );

  const handleSelectPlan = async (planId: string, stripePriceId?: string) => {
    if (stripePriceId) {
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
          window.location.href = url;
        }
      } catch (error) {
        console.error('Checkout error:', error);
        alert('決済の開始に失敗しました。もう一度お試しください。');
      }
    }
  };

  const handleContact = () => {
    router.push('/contact?plan=enterprise');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingTop: '40px',
      paddingBottom: '80px',
    }}>
      {/* 戻るリンク */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        marginBottom: '40px',
      }}>
        <button
          onClick={() => router.push('/pricing')}
          style={{
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: 0,
          }}
        >
          ← 個人向けプランを見る
        </button>
      </div>

      {/* ヘッダー */}
      <div style={{
        textAlign: 'center',
        marginBottom: '60px',
      }}>
        <h1 style={{
          fontSize: '42px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '20px',
        }}>
          法人・団体向けプラン
        </h1>
        <p style={{
          fontSize: '20px',
          color: '#6b7280',
          maxWidth: '700px',
          margin: '0 auto',
          lineHeight: '1.6',
        }}>
          地域コミュニティや介護施設など、<br />
          多くの世帯を見守る組織向けのプランです。
        </p>
      </div>

      {/* 町内会・自治会向けセクション */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 80px',
        padding: '0 20px',
      }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '16px',
          textAlign: 'center',
        }}>
          町内会・自治会向け
        </h2>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '40px',
          textAlign: 'center',
        }}>
          地域の高齢者見守り活動を支援します
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '30px',
          maxWidth: '760px',
          margin: '0 auto',
        }}>
          {communityPlans.map((plan) => (
            <div
              key={plan.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '36px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
              }}
            >
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
                marginBottom: '24px',
              }}>
                {plan.description}
              </p>
              
              <div style={{
                marginBottom: '32px',
              }}>
                <span style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                }}>
                  ¥{plan.price.toLocaleString()}
                </span>
                <span style={{
                  fontSize: '16px',
                  color: '#6b7280',
                }}>
                  /月
                </span>
              </div>

              <ul style={{
                listStyle: 'none',
                padding: 0,
                marginBottom: '32px',
              }}>
                <li style={{
                  marginBottom: '12px',
                  fontSize: '15px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  {plan.features.maxHouseholds}世帯まで管理
                </li>
                <li style={{
                  marginBottom: '12px',
                  fontSize: '15px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  1日{plan.features.maxAlerts}件のアラート
                </li>
                <li style={{
                  marginBottom: '12px',
                  fontSize: '15px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  LINE・SMS・音声通話対応
                </li>
                <li style={{
                  marginBottom: '12px',
                  fontSize: '15px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  管理者向けレポート機能
                </li>
                {plan.features.apiAccess && (
                  <li style={{
                    marginBottom: '12px',
                    fontSize: '15px',
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                    API連携可能
                  </li>
                )}
                <li style={{
                  fontSize: '15px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  {plan.features.support === 'priority' ? '優先' : 'メール'}サポート
                </li>
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.id, plan.stripePriceId)}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
              >
                申し込む
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 介護施設・事業者向けセクション */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 80px',
        padding: '0 20px',
      }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '16px',
          textAlign: 'center',
        }}>
          介護施設・事業者向け
        </h2>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '40px',
          textAlign: 'center',
        }}>
          プロフェッショナルな見守りサービスの提供を支援
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '30px',
          maxWidth: '760px',
          margin: '0 auto',
        }}>
          {businessPlans.map((plan) => (
            <div
              key={plan.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '36px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
              }}
            >
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
                marginBottom: '24px',
              }}>
                {plan.description}
              </p>
              
              <div style={{
                marginBottom: '32px',
              }}>
                <span style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                }}>
                  ¥{plan.price.toLocaleString()}
                </span>
                <span style={{
                  fontSize: '16px',
                  color: '#6b7280',
                }}>
                  /月
                </span>
              </div>

              <ul style={{
                listStyle: 'none',
                padding: 0,
                marginBottom: '32px',
              }}>
                <li style={{
                  marginBottom: '12px',
                  fontSize: '15px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  {plan.features.maxHouseholds}世帯まで管理
                </li>
                <li style={{
                  marginBottom: '12px',
                  fontSize: '15px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  1日{plan.features.maxAlerts.toLocaleString()}件のアラート
                </li>
                <li style={{
                  marginBottom: '12px',
                  fontSize: '15px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  全通知方法対応
                </li>
                <li style={{
                  marginBottom: '12px',
                  fontSize: '15px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  詳細分析レポート
                </li>
                <li style={{
                  marginBottom: '12px',
                  fontSize: '15px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  API連携・システム統合
                </li>
                <li style={{
                  fontSize: '15px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                  優先サポート
                </li>
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.id, plan.stripePriceId)}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
              >
                申し込む
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* エンタープライズプラン */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '0 20px',
      }}>
        <div style={{
          backgroundColor: '#1f2937',
          borderRadius: '16px',
          padding: '60px 48px',
          textAlign: 'center',
          color: 'white',
        }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: 'bold',
            marginBottom: '20px',
          }}>
            エンタープライズプラン
          </h2>
          <p style={{
            fontSize: '20px',
            marginBottom: '40px',
            lineHeight: '1.7',
            color: '#d1d5db',
          }}>
            50世帯以上の大規模導入や<br />
            特別な要件がある組織様向けのカスタムプラン
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '30px',
            maxWidth: '600px',
            margin: '0 auto 40px',
          }}>
            <div>
              <div style={{
                fontSize: '48px',
                marginBottom: '8px',
              }}>
                ∞
              </div>
              <div style={{
                fontSize: '14px',
                color: '#d1d5db',
              }}>
                無制限の世帯数
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '48px',
                marginBottom: '8px',
              }}>
                24/7
              </div>
              <div style={{
                fontSize: '14px',
                color: '#d1d5db',
              }}>
                専任サポート
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '48px',
                marginBottom: '8px',
              }}>
                🛠️
              </div>
              <div style={{
                fontSize: '14px',
                color: '#d1d5db',
              }}>
                カスタマイズ対応
              </div>
            </div>
          </div>

          <button
            onClick={handleContact}
            style={{
              padding: '16px 48px',
              backgroundColor: 'white',
              color: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            お問い合わせ
          </button>
        </div>
      </div>

      {/* 特徴セクション */}
      <div style={{
        maxWidth: '1000px',
        margin: '80px auto 0',
        padding: '0 20px',
      }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '40px',
          textAlign: 'center',
        }}>
          法人プランの特徴
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '30px',
        }}>
          <div style={{
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '40px',
              marginBottom: '16px',
            }}>
              📊
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#1f2937',
            }}>
              詳細な管理機能
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.6',
            }}>
              複数世帯の一括管理、<br />
              グループ設定、権限管理など
            </p>
          </div>
          
          <div style={{
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '40px',
              marginBottom: '16px',
            }}>
              🔌
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#1f2937',
            }}>
              API連携
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.6',
            }}>
              既存システムとの連携、<br />
              データエクスポート機能
            </p>
          </div>
          
          <div style={{
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '40px',
              marginBottom: '16px',
            }}>
              🎯
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#1f2937',
            }}>
              優先サポート
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              lineHeight: '1.6',
            }}>
              専任担当者による<br />
              迅速な対応とサポート
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessPricingPage;