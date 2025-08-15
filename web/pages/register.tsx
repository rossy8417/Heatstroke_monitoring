import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/supabase';
import { getPlanById } from '../lib/subscription-plans';

const RegisterPage: React.FC = () => {
  const router = useRouter();
  const { plan: planId } = router.query;
  
  // プラン情報を取得
  const selectedPlan = planId ? getPlanById(planId as string) : null;
  
  // プランに基づいてユーザータイプを自動設定
  const getDefaultUserType = () => {
    if (!selectedPlan) return 'individual';
    return selectedPlan.userType;
  };
  
  const [step, setStep] = useState(1); // 1: ユーザータイプ選択/確認, 2: 情報入力
  const [userType, setUserType] = useState<'individual' | 'business' | 'community'>(getDefaultUserType());
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    organizationName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // プランが変更されたらユーザータイプを更新
  useEffect(() => {
    if (selectedPlan) {
      setUserType(selectedPlan.userType);
      // 個人向けプランの場合は直接ステップ2へ
      if (selectedPlan.userType === 'individual') {
        setStep(2);
      }
    }
  }, [selectedPlan]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // パスワード確認
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (formData.password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await auth.signUp(
        formData.email,
        formData.password,
        {
          name: formData.name,
          phone: formData.phone,
          user_type: userType,
          organization_name: userType !== 'individual' ? formData.organizationName : null,
          selected_plan: planId || 'free',
        }
      );

      if (error) {
        if (error.message.includes('already registered')) {
          setError('このメールアドレスは既に登録されています');
        } else {
          setError('登録に失敗しました。もう一度お試しください');
        }
        return;
      }

      // 登録成功
      alert('確認メールを送信しました。メールを確認してアカウントを有効化してください。');
      
      // 有料プランの場合は決済ページへ
      if (selectedPlan && selectedPlan.stripePriceId) {
        router.push(`/checkout?plan=${planId}`);
      } else {
        router.push('/login');
      }
    } catch (err) {
      setError('登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '500px',
      }}>
        {/* プラン情報表示 */}
        {selectedPlan && (
          <div style={{
            backgroundColor: '#eff6ff',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            borderLeft: '4px solid #3b82f6',
          }}>
            <div style={{
              fontSize: '14px',
              color: '#1e40af',
              fontWeight: '600',
              marginBottom: '4px',
            }}>
              選択中のプラン
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '4px',
            }}>
              {selectedPlan.name}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#6b7280',
            }}>
              {selectedPlan.price === 0 ? '無料' : `月額 ¥${selectedPlan.price.toLocaleString()}`}
              {selectedPlan.userType === 'individual' && ` • 最大${selectedPlan.features.maxHouseholds}世帯まで`}
            </div>
          </div>
        )}

        {/* タイトル */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px',
          }}>
            新規登録
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
          }}>
            {step === 1 && !selectedPlan 
              ? 'ご利用タイプを選択してください' 
              : 'アカウント情報を入力してください'}
          </p>
        </div>

        {/* ステップ1: ユーザータイプ選択（プラン未選択時のみ） */}
        {step === 1 && !selectedPlan && (
          <div>
            <div style={{
              display: 'grid',
              gap: '15px',
              marginBottom: '30px',
            }}>
              {/* 個人・家族向け */}
              <label style={{
                display: 'block',
                padding: '20px',
                border: `2px solid ${userType === 'individual' ? '#3b82f6' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: userType === 'individual' ? '#eff6ff' : 'white',
              }}>
                <input
                  type="radio"
                  name="userType"
                  value="individual"
                  checked={userType === 'individual'}
                  onChange={(e) => setUserType(e.target.value as any)}
                  style={{ marginRight: '10px' }}
                />
                <span style={{ fontWeight: '600' }}>👨‍👩‍👧 個人・家族向け</span>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '5px',
                  marginLeft: '25px',
                }}>
                  ご家族の見守りに（1〜3世帯）
                </p>
              </label>

              {/* 町内会・自治会 */}
              <label style={{
                display: 'block',
                padding: '20px',
                border: `2px solid ${userType === 'community' ? '#3b82f6' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: userType === 'community' ? '#eff6ff' : 'white',
              }}>
                <input
                  type="radio"
                  name="userType"
                  value="community"
                  checked={userType === 'community'}
                  onChange={(e) => setUserType(e.target.value as any)}
                  style={{ marginRight: '10px' }}
                />
                <span style={{ fontWeight: '600' }}>🏘️ 町内会・自治会</span>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '5px',
                  marginLeft: '25px',
                }}>
                  地域の見守り活動に（〜20世帯）
                </p>
              </label>

              {/* 事業者向け */}
              <label style={{
                display: 'block',
                padding: '20px',
                border: `2px solid ${userType === 'business' ? '#3b82f6' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: userType === 'business' ? '#eff6ff' : 'white',
              }}>
                <input
                  type="radio"
                  name="userType"
                  value="business"
                  checked={userType === 'business'}
                  onChange={(e) => setUserType(e.target.value as any)}
                  style={{ marginRight: '10px' }}
                />
                <span style={{ fontWeight: '600' }}>🏢 介護施設・事業者</span>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginTop: '5px',
                  marginLeft: '25px',
                }}>
                  施設利用者の見守りに（20世帯〜）
                </p>
              </label>
            </div>

            <button
              onClick={() => setStep(2)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              次へ
            </button>

            {/* プラン選択へのリンク */}
            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              fontSize: '14px',
              color: '#6b7280',
            }}>
              プランを選んでから登録したい方は
              <button
                onClick={() => router.push('/pricing')}
                style={{
                  color: '#3b82f6',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginLeft: '4px',
                }}
              >
                料金プランページへ
              </button>
            </div>
          </div>
        )}

        {/* ステップ2: 情報入力 */}
        {(step === 2 || selectedPlan) && (
          <form onSubmit={handleRegister}>
            {/* エラーメッセージ */}
            {error && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}

            {/* 組織名（事業者・団体のみ） */}
            {userType !== 'individual' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                }}>
                  {userType === 'community' ? '団体名' : '事業者名'} *
                </label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                  placeholder={userType === 'community' ? '○○町内会' : '株式会社○○'}
                />
              </div>
            )}

            {/* お名前 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}>
                {userType === 'individual' ? 'お名前' : '担当者名'} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                placeholder="山田太郎"
              />
            </div>

            {/* メールアドレス */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}>
                メールアドレス *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                placeholder="example@email.com"
              />
            </div>

            {/* 電話番号 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}>
                電話番号
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                placeholder="090-1234-5678"
              />
            </div>

            {/* パスワード */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}>
                パスワード *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                placeholder="6文字以上"
              />
            </div>

            {/* パスワード確認 */}
            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}>
                パスワード（確認） *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                placeholder="もう一度入力"
              />
            </div>

            {/* 登録ボタン */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '登録中...' : 
                selectedPlan && selectedPlan.stripePriceId ? '登録して決済へ進む' : '登録する'}
            </button>

            {/* 戻るボタン（プラン未選択時のみ） */}
            {!selectedPlan && step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: 'white',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                戻る
              </button>
            )}
          </form>
        )}

        {/* ログインリンク */}
        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
          fontSize: '14px',
          color: '#6b7280',
        }}>
          既にアカウントをお持ちの方は
          <button
            onClick={handleLoginClick}
            style={{
              color: '#3b82f6',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              marginLeft: '4px',
            }}
          >
            ログイン
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;