import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

const SubscriptionSuccessPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const { session_id } = router.query;

  useEffect(() => {
    if (session_id && user) {
      // セッション情報を確認
      verifySession();
    }
  }, [session_id, user]);

  const verifySession = async () => {
    try {
      const response = await fetch('/api/stripe/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session_id,
          userId: user?.id,
        }),
      });

      if (response.ok) {
        setLoading(false);
        // 3秒後にダッシュボードへリダイレクト
        setTimeout(() => {
          const userType = user?.user_metadata?.user_type || 'individual';
          if (userType === 'individual') {
            router.push('/personal/dashboard');
          } else {
            router.push('/dashboard');
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Session verification error:', error);
      setLoading(false);
    }
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
        textAlign: 'center',
      }}>
        {loading ? (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid #e5e7eb',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 1s linear infinite',
            }}>
              <style jsx>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
            <p style={{ color: '#6b7280' }}>決済を確認しています...</p>
          </>
        ) : (
          <>
            {/* 成功アイコン */}
            <div style={{
              fontSize: '64px',
              marginBottom: '20px',
            }}>
              ✅
            </div>

            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '16px',
            }}>
              お支払いが完了しました！
            </h1>

            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              marginBottom: '30px',
              lineHeight: '1.6',
            }}>
              サブスクリプションの登録が完了しました。
              プレミアム機能をすぐにご利用いただけます。
            </p>

            <div style={{
              backgroundColor: '#f0f9ff',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '30px',
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '10px',
              }}>
                次のステップ
              </h3>
              <ul style={{
                textAlign: 'left',
                fontSize: '14px',
                color: '#6b7280',
                lineHeight: '1.8',
                paddingLeft: '20px',
              }}>
                <li>ダッシュボードから世帯情報を登録</li>
                <li>見守り設定をカスタマイズ</li>
                <li>LINE連携で通知を受け取る</li>
              </ul>
            </div>

            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px',
            }}>
              まもなくダッシュボードへ移動します...
            </p>

            <button
              onClick={() => {
                const userType = user?.user_metadata?.user_type || 'individual';
                if (userType === 'individual') {
                  router.push('/personal/dashboard');
                } else {
                  router.push('/dashboard');
                }
              }}
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
              今すぐダッシュボードへ
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionSuccessPage;