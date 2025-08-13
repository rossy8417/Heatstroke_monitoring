import { createBrowserClient } from '@supabase/ssr';

// ブラウザ用Supabaseクライアント
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ユーザー型定義
export interface User {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
    user_type?: 'individual' | 'business' | 'community' | 'admin';
    phone?: string;
  };
}

// 認証ヘルパー関数
export const auth = {
  // サインアップ
  async signUp(email: string, password: string, metadata?: any) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  },

  // サインイン
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // サインアウト
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // 現在のユーザー取得
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // セッション取得
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  // パスワードリセット
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { data, error };
  },

  // パスワード更新
  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },
};