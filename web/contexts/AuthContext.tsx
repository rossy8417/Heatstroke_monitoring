import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // セッションの初期化と監視
  useEffect(() => {
    // 現在のセッションを取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // セッション変更の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      setUser(session?.user ?? null);
      
      // ログアウト時はログインページへリダイレクト
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
      
      // トークン期限切れの場合は自動更新
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // サインイン
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      // ユーザータイプに応じてリダイレクト
      const userType = data.user?.user_metadata?.user_type || 'individual';
      
      if (userType === 'individual') {
        await router.push('/personal/dashboard');
      } else {
        await router.push('/dashboard');
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // サインアップ
  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) return { error };

      // 確認メール送信後の処理
      if (data.user && !data.session) {
        // メール確認が必要な場合
        await router.push('/auth/verify-email');
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // サインアウト
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      await router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // セッションのリフレッシュ
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      setSession(data.session);
      setUser(data.user);
    } catch (error) {
      console.error('Session refresh error:', error);
      // リフレッシュ失敗時はログアウト
      await signOut();
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};