import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

/**
 * セットアップウィザード - 初回セットアップフロー
 * 1. プロファイル完成
 * 2. 見守り対象者登録
 * 3. 緊急連絡先設定
 */
const SetupWizardContent: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  // セットアップ状況を取得
  const { data: setupStatus, isLoading } = useQuery({
    queryKey: ['setupStatus'],
    queryFn: async () => {
      const response = await fetch('/api/user/setup-status', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch setup status');
      return response.json();
    },
    enabled: !!user,
  });

  // セットアップ完了時の処理
  useEffect(() => {
    if (setupStatus?.isComplete) {
      router.push('/dashboard');
    }
  }, [setupStatus, router]);

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <div>セットアップ状況を確認中...</div>
        </div>
      </div>
    );
  }

  const stepTitles = [
    'プロファイル設定',
    '見守り対象者登録',
    '緊急連絡先設定',
    '設定完了'
  ];

  const getStepFromStatus = () => {
    if (!setupStatus) return 1;
    
    switch (setupStatus.nextStep) {
      case 'profile': return 1;
      case 'households': return 2;
      case 'contacts': return 3;
      case 'complete': return 4;
      default: return 1;
    }
  };

  const actualStep = getStepFromStatus();

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
        <div style={{ 
          maxWidth: '800px', 
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#111827',
              margin: 0
            }}>
              🏠 熱中症見守りシステム - 初期設定
            </h1>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280',
              margin: '4px 0 0 0'
            }}>
              見守りを開始するために必要な設定を行います
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
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
            後で設定
          </button>
        </div>
      </header>

      {/* プログレスバー */}
      <div style={{ 
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '24px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            {stepTitles.map((title, index) => (
              <React.Fragment key={index}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  flex: index < stepTitles.length - 1 ? '1' : '0'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: actualStep > index + 1 ? '#10b981' : 
                                   actualStep === index + 1 ? '#3b82f6' : '#e5e7eb',
                    color: actualStep >= index + 1 ? 'white' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginRight: '12px'
                  }}>
                    {actualStep > index + 1 ? '✓' : index + 1}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: actualStep >= index + 1 ? '#111827' : '#6b7280'
                  }}>
                    {title}
                  </div>
                </div>
                {index < stepTitles.length - 1 && (
                  <div style={{
                    flex: '1',
                    height: '2px',
                    backgroundColor: actualStep > index + 1 ? '#10b981' : '#e5e7eb',
                    margin: '0 16px'
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '32px 24px' 
      }}>
        {actualStep === 1 && <ProfileSetupStep setupStatus={setupStatus} />}
        {actualStep === 2 && <HouseholdSetupStep setupStatus={setupStatus} />}
        {actualStep === 3 && <ContactSetupStep setupStatus={setupStatus} />}
        {actualStep === 4 && <CompleteStep setupStatus={setupStatus} />}
      </main>
    </div>
  );
};

// ステップ1: プロファイル設定
const ProfileSetupStep: React.FC<{ setupStatus: any }> = ({ setupStatus }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.reload(); // セットアップ状況を更新
      }
    } catch (error) {
      console.error('Profile update failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{ 
        fontSize: '20px', 
        fontWeight: '600', 
        marginBottom: '16px',
        color: '#111827'
      }}>
        👤 あなたの基本情報を入力してください
      </h2>
      
      <p style={{ 
        color: '#6b7280', 
        marginBottom: '24px' 
      }}>
        緊急時の連絡や本人確認のために必要です
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            marginBottom: '6px',
            color: '#374151' 
          }}>
            お名前 *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            placeholder="山田太郎"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            marginBottom: '6px',
            color: '#374151' 
          }}>
            電話番号 *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            placeholder="090-1234-5678"
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            marginBottom: '6px',
            color: '#374151' 
          }}>
            住所（任意）
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
            placeholder="東京都○○区○○"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.7 : 1
          }}
        >
          {isSubmitting ? '保存中...' : '次へ進む'}
        </button>
      </form>
    </div>
  );
};

// ステップ2: 見守り対象者登録
const HouseholdSetupStep: React.FC<{ setupStatus: any }> = ({ setupStatus }) => {
  const router = useRouter();

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{ 
        fontSize: '20px', 
        fontWeight: '600', 
        marginBottom: '16px',
        color: '#111827'
      }}>
        👵 見守り対象者を登録してください
      </h2>
      
      <p style={{ 
        color: '#6b7280', 
        marginBottom: '16px' 
      }}>
        プラン: <strong>{setupStatus?.maxHouseholds}世帯まで</strong> 登録可能
      </p>

      <div style={{
        backgroundColor: '#f3f4f6',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
          🏠 1世帯目の登録
        </h3>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          見守り対象となる方の情報を入力してください
        </p>
        
        <button
          onClick={() => router.push('/setup/household')}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          見守り対象者を登録する
        </button>
      </div>

      <div style={{ 
        fontSize: '14px', 
        color: '#6b7280',
        backgroundColor: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '6px',
        padding: '12px'
      }}>
        💡 <strong>入力項目:</strong> お名前、年齢、住所、電話番号、健康状態、リスクレベルなど
      </div>
    </div>
  );
};

// ステップ3: 緊急連絡先設定
const ContactSetupStep: React.FC<{ setupStatus: any }> = ({ setupStatus }) => {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      <h2 style={{ 
        fontSize: '20px', 
        fontWeight: '600', 
        marginBottom: '16px',
        color: '#111827'
      }}>
        📞 緊急連絡先を設定してください
      </h2>
      
      <p style={{ 
        color: '#6b7280', 
        marginBottom: '24px' 
      }}>
        万が一の際に連絡する家族や介護者の方を登録してください
      </p>

      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
        <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
          緊急連絡先設定機能
        </h3>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          現在実装中です。ダッシュボードから後で設定できます。
        </p>
        
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          セットアップを完了してダッシュボードへ
        </button>
      </div>
    </div>
  );
};

// ステップ4: 完了
const CompleteStep: React.FC<{ setupStatus: any }> = ({ setupStatus }) => {
  const router = useRouter();

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
      
      <h2 style={{ 
        fontSize: '24px', 
        fontWeight: '600', 
        marginBottom: '16px',
        color: '#111827'
      }}>
        セットアップが完了しました！
      </h2>
      
      <p style={{ 
        color: '#6b7280', 
        marginBottom: '32px',
        fontSize: '16px'
      }}>
        熱中症見守りシステムの利用を開始できます
      </p>

      <div style={{
        backgroundColor: '#f0f9ff',
        border: '1px solid #0ea5e9',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '32px',
        textAlign: 'left'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>
          📋 設定済み項目
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151' }}>
          <li>✅ プロファイル設定</li>
          <li>✅ 見守り対象者: {setupStatus?.householdCount}世帯</li>
          <li>✅ サブスクリプション: アクティブ</li>
        </ul>
      </div>

      <button
        onClick={() => router.push('/dashboard')}
        style={{
          backgroundColor: '#10b981',
          color: 'white',
          padding: '16px 32px',
          border: 'none',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: '600',
          cursor: 'pointer',
          marginBottom: '16px'
        }}
      >
        ダッシュボードを開く
      </button>

      <div style={{ 
        fontSize: '14px', 
        color: '#6b7280' 
      }}>
        🌡️ 気象情報の監視が自動的に開始されます
      </div>
    </div>
  );
};

export default function SetupWizard() {
  return (
    <ProtectedRoute>
      <SetupWizardContent />
    </ProtectedRoute>
  );
}