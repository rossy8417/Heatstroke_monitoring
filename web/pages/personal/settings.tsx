import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

const PersonalSettingsContent: React.FC = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = () => {
    setMessage('設定を保存しました');
    setTimeout(() => setMessage(null), 3000);
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
              設定
            </h1>
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {user?.email}
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

        {/* 通知設定 */}
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
            marginBottom: '15px',
            color: '#1f2937',
          }}>
            🔔 通知設定
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" defaultChecked />
              <span>毎日の安否確認を受け取る</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" defaultChecked />
              <span>熱中症警戒アラートを受け取る</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" />
              <span>週次レポートを受け取る</span>
            </label>
          </div>
          <div style={{ marginTop: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>
              通知時間
            </label>
            <select style={{
              width: '200px',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}>
              <option>午前9時</option>
              <option>午前10時</option>
              <option>午前11時</option>
              <option>午後12時</option>
              <option>午後1時</option>
              <option>午後2時</option>
            </select>
          </div>
        </div>

        {/* プライバシー設定 */}
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
            marginBottom: '15px',
            color: '#1f2937',
          }}>
            🔒 プライバシー
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" defaultChecked />
              <span>家族に状態を共有する</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" />
              <span>匿名データの提供に協力する</span>
            </label>
          </div>
        </div>

        {/* アカウント設定 */}
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
            marginBottom: '15px',
            color: '#1f2937',
          }}>
            👤 アカウント
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button
              onClick={() => router.push('/personal/profile')}
              style={{
                padding: '10px 16px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              プロフィールを編集 →
            </button>
            <button
              onClick={() => router.push('/personal/emergency-contacts')}
              style={{
                padding: '10px 16px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              緊急連絡先を管理 →
            </button>
            <button
              onClick={() => router.push('/account/subscription')}
              style={{
                padding: '10px 16px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              サブスクリプションを管理 →
            </button>
          </div>
        </div>

        {/* 保存ボタン */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={handleSave}
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
          <button
            onClick={() => signOut()}
            style={{
              padding: '12px 32px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            ログアウト
          </button>
        </div>
      </main>
    </div>
  );
};

const PersonalSettings: React.FC = () => {
  return (
    <ProtectedRoute requiredUserType="individual">
      <PersonalSettingsContent />
    </ProtectedRoute>
  );
};

export default PersonalSettings;