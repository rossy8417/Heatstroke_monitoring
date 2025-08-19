import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

/**
 * 見守り対象者登録ウィザード
 * 1. 基本情報入力
 * 2. 詳細設定
 * 3. 緊急連絡先設定
 */
const HouseholdSetupContent: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // 基本情報
    name: '',
    age: '',
    phone: '',
    address: '',
    address_grid: '',
    
    // 健康状態・リスク情報
    health_condition: '',
    medication_info: '',
    emergency_medical_info: '',
    risk_flag: false,
    mobility_status: 'independent', // independent, assisted, wheelchair
    
    // LINE連携
    line_user_id: '',
    
    // 備考
    notes: ''
  });

  // ユーザーのサブスクリプション情報取得
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await fetch('/api/user/subscription', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch subscription');
      return response.json();
    },
    enabled: !!user,
  });

  // 現在の世帯数取得
  const { data: householdsData } = useQuery({
    queryKey: ['userHouseholds'],
    queryFn: async () => {
      const response = await fetch('/api/user/households', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch households');
      return response.json();
    },
    enabled: !!user,
  });

  // 世帯作成ミューテーション
  const createHouseholdMutation = useMutation({
    mutationFn: async (householdData: any) => {
      const response = await fetch('/api/user/households', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify(householdData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create household');
      }
      
      return response.json();
    },
    onSuccess: () => {
      router.push('/setup?step=contacts');
    },
    onError: (error: any) => {
      alert(`登録エラー: ${error.message}`);
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep === 1) {
      // 基本情報の検証
      if (!formData.name || !formData.age || !formData.phone) {
        alert('必須項目を入力してください');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // 詳細設定の検証
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // 最終確認・登録
      createHouseholdMutation.mutate(formData);
    }
  };

  const stepTitles = [
    '基本情報',
    '詳細設定',
    '確認・登録'
  ];

  const currentCount = householdsData?.data?.length || 0;
  const maxHouseholds = subscription?.max_households || 1;
  const canAddMore = maxHouseholds === 0 || currentCount < maxHouseholds;

  if (!canAddMore) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            世帯数の上限に達しています
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            現在のプランでは{maxHouseholds}世帯まで登録可能です。<br/>
            追加で登録するにはプランをアップグレードしてください。
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/setup')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              戻る
            </button>
            <button
              onClick={() => router.push('/billing')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              プランを変更
            </button>
          </div>
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
              👵 見守り対象者登録
            </h1>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280',
              margin: '4px 0 0 0'
            }}>
              {currentCount + 1}世帯目 / {maxHouseholds === 0 ? '無制限' : maxHouseholds}世帯まで
            </p>
          </div>
          <button
            onClick={() => router.push('/setup')}
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
            セットアップに戻る
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
                    backgroundColor: currentStep > index + 1 ? '#10b981' : 
                                   currentStep === index + 1 ? '#3b82f6' : '#e5e7eb',
                    color: currentStep >= index + 1 ? 'white' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginRight: '12px'
                  }}>
                    {currentStep > index + 1 ? '✓' : index + 1}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: currentStep >= index + 1 ? '#111827' : '#6b7280'
                  }}>
                    {title}
                  </div>
                </div>
                {index < stepTitles.length - 1 && (
                  <div style={{
                    flex: '1',
                    height: '2px',
                    backgroundColor: currentStep > index + 1 ? '#10b981' : '#e5e7eb',
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
        <form onSubmit={handleStepSubmit}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            {/* ステップ1: 基本情報 */}
            {currentStep === 1 && (
              <div>
                <h2 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  color: '#111827'
                }}>
                  基本情報を入力してください
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
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
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      placeholder="山田花子"
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      marginBottom: '6px',
                      color: '#374151' 
                    }}>
                      年齢 *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="120"
                      value={formData.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      placeholder="75"
                    />
                  </div>
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
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="+819012345678"
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
                    住所
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="東京都○○区○○1-2-3"
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
                    住所グリッド（気象情報取得用）
                  </label>
                  <input
                    type="text"
                    value={formData.address_grid}
                    onChange={(e) => handleInputChange('address_grid', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="5339-24"
                  />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    気象庁の地域メッシュコードを入力してください
                  </p>
                </div>
              </div>
            )}

            {/* ステップ2: 詳細設定 */}
            {currentStep === 2 && (
              <div>
                <h2 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  color: '#111827'
                }}>
                  健康状態・リスク情報
                </h2>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    marginBottom: '6px',
                    color: '#374151' 
                  }}>
                    移動能力
                  </label>
                  <select
                    value={formData.mobility_status}
                    onChange={(e) => handleInputChange('mobility_status', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="independent">自立歩行可能</option>
                    <option value="assisted">介助が必要</option>
                    <option value="wheelchair">車椅子使用</option>
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    fontSize: '14px', 
                    fontWeight: '500' 
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.risk_flag}
                      onChange={(e) => handleInputChange('risk_flag', e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    高リスク対象者として管理
                  </label>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginLeft: '24px' }}>
                    より頻繁な安否確認や優先度の高い対応が行われます
                  </p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    marginBottom: '6px',
                    color: '#374151' 
                  }}>
                    健康状態・既往歴
                  </label>
                  <textarea
                    value={formData.health_condition}
                    onChange={(e) => handleInputChange('health_condition', e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                    placeholder="糖尿病、高血圧など"
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
                    服薬情報
                  </label>
                  <textarea
                    value={formData.medication_info}
                    onChange={(e) => handleInputChange('medication_info', e.target.value)}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                    placeholder="降圧剤、インスリンなど"
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
                    緊急時の医療情報
                  </label>
                  <textarea
                    value={formData.emergency_medical_info}
                    onChange={(e) => handleInputChange('emergency_medical_info', e.target.value)}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                    placeholder="アレルギー、かかりつけ医など"
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
                    LINE ユーザーID（任意）
                  </label>
                  <input
                    type="text"
                    value={formData.line_user_id}
                    onChange={(e) => handleInputChange('line_user_id', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="LINE連携で自動応答が可能になります"
                  />
                </div>
              </div>
            )}

            {/* ステップ3: 確認・登録 */}
            {currentStep === 3 && (
              <div>
                <h2 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  color: '#111827'
                }}>
                  登録内容の確認
                </h2>

                <div style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: '14px' }}>
                    <strong>お名前:</strong>
                    <span>{formData.name}</span>
                    
                    <strong>年齢:</strong>
                    <span>{formData.age}歳</span>
                    
                    <strong>電話番号:</strong>
                    <span>{formData.phone}</span>
                    
                    {formData.address && (
                      <>
                        <strong>住所:</strong>
                        <span>{formData.address}</span>
                      </>
                    )}
                    
                    {formData.address_grid && (
                      <>
                        <strong>住所グリッド:</strong>
                        <span>{formData.address_grid}</span>
                      </>
                    )}
                    
                    <strong>移動能力:</strong>
                    <span>
                      {formData.mobility_status === 'independent' && '自立歩行可能'}
                      {formData.mobility_status === 'assisted' && '介助が必要'}
                      {formData.mobility_status === 'wheelchair' && '車椅子使用'}
                    </span>
                    
                    <strong>リスクレベル:</strong>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: formData.risk_flag ? '#fee2e2' : '#d1fae5',
                      color: formData.risk_flag ? '#991b1b' : '#065f46'
                    }}>
                      {formData.risk_flag ? '高リスク' : '通常'}
                    </span>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '24px'
                }}>
                  <p style={{ fontSize: '14px', margin: 0 }}>
                    💡 <strong>次のステップ:</strong> 登録後、緊急連絡先の設定を行います
                  </p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    marginBottom: '6px',
                    color: '#374151' 
                  }}>
                    備考・その他の情報
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                    placeholder="特記事項があれば入力してください"
                  />
                </div>
              </div>
            )}

            {/* フッターボタン */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => {
                  if (currentStep > 1) {
                    setCurrentStep(currentStep - 1);
                  } else {
                    router.push('/setup');
                  }
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {currentStep > 1 ? '前の項目' : 'セットアップに戻る'}
              </button>

              <button
                type="submit"
                disabled={createHouseholdMutation.isPending}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: createHouseholdMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: createHouseholdMutation.isPending ? 0.7 : 1
                }}
              >
                {createHouseholdMutation.isPending ? '登録中...' : 
                 currentStep === 3 ? '登録完了' : '次へ進む'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default function HouseholdSetup() {
  return (
    <ProtectedRoute>
      <HouseholdSetupContent />
    </ProtectedRoute>
  );
}