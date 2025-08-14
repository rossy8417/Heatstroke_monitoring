import React from 'react';
import { useRouter } from 'next/router';

const VerifyEmailPage: React.FC = () => {
  const router = useRouter();

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
        {/* メールアイコン */}
        <div style={{
          fontSize: '48px',
          marginBottom: '20px',
        }}>
          📧
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '16px',
        }}>
          メールをご確認ください
        </h1>

        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '30px',
          lineHeight: '1.6',
        }}>
          登録いただいたメールアドレスに確認メールをお送りしました。
          メール内のリンクをクリックして、アカウントの登録を完了してください。
        </p>

        <div style={{
          backgroundColor: '#f3f4f6',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '10px',
          }}>
            メールが届かない場合
          </h3>
          <ul style={{
            textAlign: 'left',
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: '1.8',
            paddingLeft: '20px',
          }}>
            <li>迷惑メールフォルダをご確認ください</li>
            <li>メールアドレスが正しく入力されているかご確認ください</li>
            <li>数分待ってもメールが届かない場合は、再送信してください</li>
          </ul>
        </div>

        <button
          onClick={() => router.push('/login')}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          ログインページへ戻る
        </button>
      </div>
    </div>
  );
};

export default VerifyEmailPage;