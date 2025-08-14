import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

// ユーザータイプの定義
export type UserType = 'individual' | 'business' | 'community' | 'admin' | null;

// プランタイプの定義
export type PlanType = 'free' | 'personal' | 'family' | 'community' | 'business' | 'enterprise';

interface User {
  id: string;
  email: string;
  userType: UserType;
  name: string;
  subscription: {
    plan: PlanType;
    status: string;
    maxHouseholds: number;
    features: Record<string, boolean>;
  };
}

// モード別のレイアウトコンポーネント
export const ModeRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ユーザー情報を取得（実際にはAPIから）
    const fetchUser = async () => {
      try {
        // TODO: 実際のAPI呼び出しに置き換え
        const mockUser: User = {
          id: '1',
          email: 'test@example.com',
          userType: 'individual', // or 'business', 'community', 'admin'
          name: '山田太郎',
          subscription: {
            plan: 'personal',
            status: 'active',
            maxHouseholds: 1,
            features: {
              basic_alerts: true,
              weather_alerts: true,
              line_notifications: true,
              sms_notifications: false,
              reports: false,
            },
          },
        };
        setUser(mockUser);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // ユーザータイプに応じたリダイレクト
  useEffect(() => {
    if (!loading && user) {
      const currentPath = router.pathname;
      
      // 個人ユーザーの場合
      if (user.userType === 'individual') {
        // ビジネス向けページにアクセスしようとしたら個人向けにリダイレクト
        if (currentPath.startsWith('/business') || currentPath.startsWith('/admin')) {
          router.push('/personal/dashboard');
        }
      }
      
      // ビジネス/コミュニティユーザーの場合
      if (user.userType === 'business' || user.userType === 'community') {
        // 個人向けページにアクセスしようとしたらビジネス向けにリダイレクト
        if (currentPath.startsWith('/personal')) {
          router.push('/dashboard');
        }
      }
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
      }}>
        <div>読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
      }}>
        <div>
          <h2>ログインが必要です</h2>
          <button
            onClick={() => router.push('/login')}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ログインページへ
          </button>
        </div>
      </div>
    );
  }

  // ユーザータイプに応じたUIラッパー
  return (
    <div className={`mode-${user.userType}`}>
      {/* プラン情報バナー（必要に応じて表示） */}
      {user.subscription.plan === 'free' && (
        <div style={{
          backgroundColor: '#fef3c7',
          padding: '10px',
          textAlign: 'center',
          borderBottom: '1px solid #fbbf24',
        }}>
          無料プランをご利用中です。
          <button
            onClick={() => router.push('/pricing')}
            style={{
              marginLeft: '10px',
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              cursor: 'pointer',
              padding: 0,
              fontSize: 'inherit',
            }}
          >
            プランをアップグレード
          </button>
        </div>
      )}
      
      {/* メインコンテンツ */}
      {children}
    </div>
  );
};

// プラン別の機能制限チェック
export const useFeatureAccess = (feature: string): boolean => {
  const [user, setUser] = useState<User | null>(null);
  
  // TODO: 実際のユーザー情報取得
  useEffect(() => {
    // ユーザー情報を取得
  }, []);
  
  if (!user) return false;
  return user.subscription.features[feature] || false;
};

// プラン別の数量制限チェック
export const useLimitCheck = (limitType: 'households' | 'alerts' | 'contacts'): { 
  current: number; 
  max: number; 
  canAdd: boolean 
} => {
  // TODO: 実装
  return {
    current: 0,
    max: 1,
    canAdd: true,
  };
};