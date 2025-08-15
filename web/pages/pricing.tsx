import React from 'react';
import { useRouter } from 'next/router';
import { SUBSCRIPTION_PLANS } from '../lib/subscription-plans';

/**
 * 料金プランページ（シンプル版）
 * 個人・家族向けプランのみ表示
 */
const PricingPage: React.FC = () => {
  const router = useRouter();
  
  // 個人向けプランのみ取得（無料、パーソナル、ファミリー）
  const displayPlans = SUBSCRIPTION_PLANS.filter(
    plan => plan.id === 'free' || plan.id === 'personal' || plan.id === 'family'
  );

  const handleSelectPlan = async (planId: string) => {
    // プランIDを含めて登録ページへ遷移
    router.push(`/register?plan=${planId}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingTop: '60px',
      paddingBottom: '80px',
    }}>
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
          シンプルな料金プラン
        </h1>
        <p style={{
          fontSize: '20px',
          color: '#6b7280',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.6',
        }}>
          必要な機能を、適正な価格で。<br />
          いつでもプラン変更・解約が可能です。
        </p>
      </div>

      {/* プランカード */}
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px',
        padding: '0 20px',
      }}>
        {displayPlans.map((plan) => {
          const isPopular = plan.id === 'family';
          const isFree = plan.id === 'free';

          return (
            <div
              key={plan.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '40px 30px',
                boxShadow: isPopular ? '0 25px 50px -12px rgba(0,0,0,0.25)' : '0 4px 6px -1px rgba(0,0,0,0.1)',
                border: isPopular ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                transform: isPopular ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {/* 人気バッジ */}
              {isPopular && (
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '6px 20px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  letterSpacing: '0.5px',
                }}>
                  一番人気
                </div>
              )}

              {/* プラン名 */}
              <h3 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '12px',
                textAlign: 'center',
              }}>
                {plan.name}
              </h3>

              {/* 説明 */}
              <p style={{
                fontSize: '16px',
                color: '#6b7280',
                marginBottom: '30px',
                textAlign: 'center',
                minHeight: '48px',
              }}>
                {plan.description}
              </p>

              {/* 価格 */}
              <div style={{
                marginBottom: '40px',
                textAlign: 'center',
              }}>
                <span style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: isFree ? '#6b7280' : '#1f2937',
                }}>
                  ¥{plan.price.toLocaleString()}
                </span>
                <span style={{
                  fontSize: '18px',
                  color: '#6b7280',
                  marginLeft: '8px',
                }}>
                  /月
                </span>
              </div>

              {/* 主要機能リスト */}
              <ul style={{
                listStyle: 'none',
                padding: 0,
                marginBottom: '40px',
                flex: 1,
              }}>
                <li style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '16px',
                  fontSize: '16px',
                  color: '#374151',
                }}>
                  <span style={{
                    color: '#10b981',
                    marginRight: '12px',
                    fontSize: '20px',
                  }}>
                    ✓
                  </span>
                  <strong>{plan.features.maxHouseholds}世帯</strong>まで見守り可能
                </li>
                
                <li style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '16px',
                  fontSize: '16px',
                  color: '#374151',
                }}>
                  <span style={{
                    color: '#10b981',
                    marginRight: '12px',
                    fontSize: '20px',
                  }}>
                    ✓
                  </span>
                  1日<strong>{plan.features.maxAlerts}回</strong>まで確認
                </li>

                <li style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '16px',
                  fontSize: '16px',
                  color: '#374151',
                }}>
                  <span style={{
                    color: '#10b981',
                    marginRight: '12px',
                    fontSize: '20px',
                  }}>
                    ✓
                  </span>
                  LINE通知{plan.features.smsNotifications && '・SMS通知'}
                  {plan.features.voiceCalls && '・音声通話'}
                </li>

                {plan.features.reports && (
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '16px',
                    fontSize: '16px',
                    color: '#374151',
                  }}>
                    <span style={{
                      color: '#10b981',
                      marginRight: '12px',
                      fontSize: '20px',
                    }}>
                      ✓
                    </span>
                    詳細レポート機能
                  </li>
                )}

                <li style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '16px',
                  fontSize: '16px',
                  color: '#374151',
                }}>
                  <span style={{
                    color: '#10b981',
                    marginRight: '12px',
                    fontSize: '20px',
                  }}>
                    ✓
                  </span>
                  {plan.features.support === 'email' ? 'メール' : 'コミュニティ'}サポート
                </li>

                {/* 制限事項を1-2個だけ表示 */}
                {!plan.features.smsNotifications && !isFree && (
                  <li style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '16px',
                    fontSize: '15px',
                    color: '#9ca3af',
                  }}>
                    <span style={{
                      color: '#9ca3af',
                      marginRight: '12px',
                      fontSize: '20px',
                    }}>
                      －
                    </span>
                    SMS・音声通話なし
                  </li>
                )}
              </ul>

              {/* CTAボタン */}
              <button
                onClick={() => handleSelectPlan(plan.id)}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: isFree ? 'white' : isPopular ? '#3b82f6' : '#6366f1',
                  color: isFree ? '#3b82f6' : 'white',
                  border: isFree ? '2px solid #3b82f6' : 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isFree) {
                    e.currentTarget.style.backgroundColor = isPopular ? '#2563eb' : '#4f46e5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isFree) {
                    e.currentTarget.style.backgroundColor = isPopular ? '#3b82f6' : '#6366f1';
                  }
                }}
              >
                {isFree ? '無料で始める' : '今すぐ申し込む'}
              </button>
            </div>
          );
        })}
      </div>

      {/* 法人・団体向けセクション */}
      <div style={{
        maxWidth: '800px',
        margin: '80px auto 0',
        padding: '0 20px',
        textAlign: 'center',
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '48px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
        }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '20px',
          }}>
            法人・団体のお客様へ
          </h2>
          <p style={{
            fontSize: '18px',
            color: '#6b7280',
            marginBottom: '32px',
            lineHeight: '1.8',
          }}>
            町内会・自治会、介護施設、医療機関などの<br />
            法人・団体様向けのプランもご用意しています。
          </p>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '40px',
            flexWrap: 'wrap',
            marginBottom: '32px',
          }}>
            <div style={{ textAlign: 'left' }}>
              <h4 style={{ 
                fontWeight: 'bold', 
                marginBottom: '12px',
                color: '#374151',
                fontSize: '16px',
              }}>
                町内会・自治会向け
              </h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                  • 10〜20世帯の見守り
                </li>
                <li style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                  • 地域コミュニティ支援
                </li>
                <li style={{ fontSize: '14px', color: '#6b7280' }}>
                  • 月額3,000円〜
                </li>
              </ul>
            </div>
            
            <div style={{ textAlign: 'left' }}>
              <h4 style={{ 
                fontWeight: 'bold', 
                marginBottom: '12px',
                color: '#374151',
                fontSize: '16px',
              }}>
                介護施設・事業者向け
              </h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                  • 30〜50世帯の管理
                </li>
                <li style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                  • API連携対応
                </li>
                <li style={{ fontSize: '14px', color: '#6b7280' }}>
                  • 月額10,000円〜
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => router.push('/pricing/business')}
            style={{
              padding: '14px 36px',
              backgroundColor: '#1f2937',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '17px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1f2937';
            }}
          >
            法人向けプランを見る
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
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '30px',
          textAlign: 'center',
        }}>
          よくある質問
        </h2>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '36px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ 
              fontWeight: 'bold', 
              marginBottom: '10px',
              fontSize: '17px',
              color: '#1f2937',
            }}>
              どのプランを選べばよいですか？
            </h4>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6' }}>
              1世帯のみの見守りなら「パーソナル」、ご家族や親戚など複数世帯の見守りなら「ファミリー」がおすすめです。
              まずは無料プランでお試しいただくこともできます。
            </p>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ 
              fontWeight: 'bold', 
              marginBottom: '10px',
              fontSize: '17px',
              color: '#1f2937',
            }}>
              プランはいつでも変更できますか？
            </h4>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6' }}>
              はい、いつでもアップグレード・ダウングレードが可能です。日割り計算で調整されます。
            </p>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ 
              fontWeight: 'bold', 
              marginBottom: '10px',
              fontSize: '17px',
              color: '#1f2937',
            }}>
              解約はいつでもできますか？
            </h4>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6' }}>
              はい、いつでも解約可能です。解約後も期間終了まではご利用いただけます。
            </p>
          </div>
          <div>
            <h4 style={{ 
              fontWeight: 'bold', 
              marginBottom: '10px',
              fontSize: '17px',
              color: '#1f2937',
            }}>
              支払い方法は？
            </h4>
            <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6' }}>
              クレジットカード（Visa, Mastercard, JCB, AMEX）でのお支払いが可能です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;