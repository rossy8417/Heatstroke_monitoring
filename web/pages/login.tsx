import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/supabase';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        setError('メールアドレスまたはパスワードが正しくありません');
        return;
      }

      // ユーザータイプに応じてリダイレクト
      const userType = data.user?.user_metadata?.user_type || 'individual';
      
      if (userType === 'individual') {
        router.push('/personal/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('ログインに失敗しました');
    } finally {
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
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* ロゴ・タイトル */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px',
          }}>
            熱中症見守りシステム
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
          }}>
            アカウントにログイン
          </p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* ログインフォーム */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
            }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="example@email.com"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
            }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              placeholder="••••••••"
            />
          </div>

          {/* パスワードを忘れた場合 */}
          <div style={{
            textAlign: 'right',
            marginBottom: '20px',
          }}>
            <button
              onClick={() => router.push('/forgot-password')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                color: '#3b82f6',
                textDecoration: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              パスワードを忘れた場合
            </button>
          </div>

          {/* ログインボタン */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        {/* 区切り線 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '30px 0 20px',
        }}>
          <div style={{
            flex: 1,
            height: '1px',
            backgroundColor: '#e5e7eb',
          }} />
          <span style={{
            padding: '0 10px',
            fontSize: '14px',
            color: '#6b7280',
          }}>
            または
          </span>
          <div style={{
            flex: 1,
            height: '1px',
            backgroundColor: '#e5e7eb',
          }} />
        </div>

        {/* 新規登録リンク */}
        <div style={{
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
          }}>
            アカウントをお持ちでない方は
          </p>
          <button
            onClick={() => router.push('/register')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '14px',
              color: '#3b82f6',
              textDecoration: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '5px',
            }}
          >
            新規登録
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;