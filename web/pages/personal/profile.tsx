import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

const PersonalProfileContent: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.name || '',
    phone: user?.user_metadata?.phone || '',
    birthDate: user?.user_metadata?.birth_date || '',
    address: user?.user_metadata?.address || '',
    healthConditions: user?.user_metadata?.health_conditions || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('プロフィールを更新しました');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f0f9ff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: 'white',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => router.push('/personal/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '16px',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ← 戻る
            </button>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: 0,
            }}>
              プロフィール編集
            </h1>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {/* メッセージ */}
        {message && (
          <div style={{
            backgroundColor: '#d1fae5',
            color: '#065f46',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 基本情報 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '20px',
              color: '#1f2937',
            }}>
              基本情報
            </h2>
            
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                }}>
                  お名前 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                  placeholder="山田 太郎"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                }}>
                  電話番号 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
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

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                }}>
                  生年月日
                </label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                }}>
                  住所
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                  placeholder="東京都千代田区..."
                />
              </div>
            </div>
          </div>

          {/* 健康情報 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '20px',
              color: '#1f2937',
            }}>
              健康情報
            </h2>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
              }}>
                既往歴・健康上の注意事項
              </label>
              <textarea
                name="healthConditions"
                value={formData.healthConditions}
                onChange={handleChange}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
                placeholder="高血圧、糖尿病など、熱中症リスクに関連する情報をご記入ください"
              />
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" />
                <span style={{ fontSize: '14px' }}>
                  熱中症リスクが高い（65歳以上、持病あり、など）
                </span>
              </label>
            </div>
          </div>

          {/* ボタン */}
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
          }}>
            <button
              type="button"
              onClick={() => router.push('/personal/dashboard')}
              style={{
                padding: '12px 32px',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              style={{
                padding: '12px 32px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              保存する
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

const PersonalProfile: React.FC = () => {
  return (
    <ProtectedRoute requiredUserType="individual">
      <PersonalProfileContent />
    </ProtectedRoute>
  );
};

export default PersonalProfile;