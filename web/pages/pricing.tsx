import React from 'react';
import { useRouter } from 'next/router';

/**
 * 料金プランページ
 * Stripeと連携して決済処理
 */
const PricingPage: React.FC = () => {
  const router = useRouter();

  const plans = [
    {
      id: 'free',
      name: '無料プラン',
      price: '¥0',
      period: '/月',
      description: 'まずはお試し',
      features: [
        '1世帯まで',
        '1日5回まで確認',
        '基本的なアラート',
        'メール通知',
      ],
      limitations: [
        'LINE通知なし',
        'レポート機能なし',
        '優先サポートなし',
      ],
      buttonText: '無料で始める',
      buttonStyle: 'outline',
      popular: false,
    },
    {
      id: 'personal',
      name: 'パーソナル',
      price: '¥500',
      period: '/月',
      description: '個人利用に最適',
      features: [
        '1世帯まで',
        '1日50回まで確認',
        '天気連動アラート',
        'LINE通知',
        '基本レポート',
      ],
      limitations: [
        'SMS通知なし',
        '優先サポートなし',
      ],
      buttonText: '申し込む',
      buttonStyle: 'primary',
      popular: false,
    },
    {
      id: 'family',
      name: 'ファミリー',
      price: '¥1,500',
      period: '/月',
      description: '複数世帯の見守りに',
      features: [
        '3世帯まで',
        '1日150回まで確認',
        '天気連動アラート',
        'LINE通知',
        'SMS通知',
        '詳細レポート',
        '家族間共有',
      ],
      limitations: [
        '優先サポートなし',
      ],
      buttonText: '申し込む',
      buttonStyle: 'primary',
      popular: true,
    },
    {
      id: 'community',
      name: 'コミュニティ',
      price: '¥5,000',
      period: '/月',
      description: '町内会・自治会向け',
      features: [
        '20世帯まで',
        '無制限確認',
        '全機能利用可能',
        '優先サポート',
        '管理者権限',
        'CSVエクスポート',
        '月次レポート',
      ],
      limitations: [],
      buttonText: '申し込む',
      buttonStyle: 'primary',
      popular: false,
    },
  ];

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      // 無料プランは直接登録
      router.push('/register?plan=free');
    } else {
      // 有料プランはStripe決済へ
      // TODO: Stripe Checkoutセッション作成
      console.log('Creating Stripe checkout for plan:', planId);
      
      // 仮実装
      alert(`プラン「${plans.find(p => p.id === planId)?.name}」の決済ページへ移動します`);
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
        marginBottom: '60px',
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
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '30px',
        padding: '0 20px',
      }}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              boxShadow: plan.popular ? '0 20px 40px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)',
              border: plan.popular ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              position: 'relative',
              transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {/* 人気バッジ */}
            {plan.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '4px 16px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}>
                おすすめ
              </div>
            )}

            {/* プラン名 */}
            <h3 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '8px',
            }}>
              {plan.name}
            </h3>

            {/* 説明 */}
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px',
            }}>
              {plan.description}
            </p>

            {/* 価格 */}
            <div style={{
              marginBottom: '30px',
            }}>
              <span style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#1f2937',
              }}>
                {plan.price}
              </span>
              <span style={{
                fontSize: '16px',
                color: '#6b7280',
              }}>
                {plan.period}
              </span>
            </div>

            {/* 機能リスト */}
            <ul style={{
              listStyle: 'none',
              padding: 0,
              marginBottom: '20px',
            }}>
              {plan.features.map((feature, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '12px',
                  fontSize: '14px',
                  color: '#374151',
                }}>
                  <span style={{
                    color: '#10b981',
                    marginRight: '8px',
                    fontSize: '16px',
                  }}>
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
              {plan.limitations.map((limitation, i) => (
                <li key={`lim-${i}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '12px',
                  fontSize: '14px',
                  color: '#9ca3af',
                }}>
                  <span style={{
                    color: '#9ca3af',
                    marginRight: '8px',
                    fontSize: '16px',
                  }}>
                    ✗
                  </span>
                  {limitation}
                </li>
              ))}
            </ul>

            {/* CTAボタン */}
            <button
              onClick={() => handleSelectPlan(plan.id)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: plan.buttonStyle === 'outline' ? 'white' : '#3b82f6',
                color: plan.buttonStyle === 'outline' ? '#3b82f6' : 'white',
                border: plan.buttonStyle === 'outline' ? '2px solid #3b82f6' : 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (plan.buttonStyle !== 'outline') {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (plan.buttonStyle !== 'outline') {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>

      {/* エンタープライズ */}
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
          }}>
            100世帯以上の大規模導入や、カスタマイズが必要な場合はお問い合わせください。
          </p>
          <button
            onClick={() => router.push('/contact')}
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