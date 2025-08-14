import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'individual' | 'business' | 'community' | 'admin';
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredUserType,
  redirectTo = '/login',
}) => {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // ユーザーがログインしていない場合
      if (!user) {
        router.push(redirectTo);
        return;
      }

      // 特定のユーザータイプが必要な場合
      if (requiredUserType) {
        const userType = user.user_metadata?.user_type;
        
        // 権限チェック
        if (userType !== requiredUserType) {
          // adminは全ページアクセス可能
          if (userType === 'admin') {
            return;
          }
          
          // 権限がない場合は適切なダッシュボードへリダイレクト
          if (userType === 'individual') {
            router.push('/personal/dashboard');
          } else {
            router.push('/dashboard');
          }
        }
      }
    }
  }, [user, loading, requiredUserType, redirectTo, router]);

  // ローディング中の表示
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
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
          <p style={{ color: '#6b7280' }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  // 認証されていない場合は何も表示しない（リダイレクト中）
  if (!user) {
    return null;
  }

  return <>{children}</>;
};