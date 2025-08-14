import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

const AuthCallbackPage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URLからトークンを取得してセッションを確立
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/login');
          return;
        }

        if (session) {
          // ユーザータイプに応じてリダイレクト
          const userType = session.user?.user_metadata?.user_type || 'individual';
          
          if (userType === 'individual') {
            router.push('/personal/dashboard');
          } else {
            router.push('/dashboard');
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Callback error:', error);
        router.push('/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
    }}>
      <div style={{
        textAlign: 'center',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
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
        <p style={{ color: '#6b7280' }}>認証中...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;