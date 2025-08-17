import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { useAuth } from '../../contexts/AuthContext';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  priority: number;
}

const PersonalEmergencyContactsContent: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: '山田 花子',
      relationship: '配偶者',
      phone: '090-1111-2222',
      priority: 1,
    },
    {
      id: '2',
      name: '山田 一郎',
      relationship: '息子',
      phone: '090-3333-4444',
      priority: 2,
    },
  ]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    relationship: '',
    phone: '',
  });

  const handleAdd = () => {
    if (newContact.name && newContact.phone) {
      setContacts([
        ...contacts,
        {
          id: Date.now().toString(),
          ...newContact,
          priority: contacts.length + 1,
        },
      ]);
      setNewContact({ name: '', relationship: '', phone: '' });
      setIsAddingNew(false);
      setMessage('連絡先を追加しました');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDelete = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
    setMessage('連絡先を削除しました');
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePriorityChange = (id: string, direction: 'up' | 'down') => {
    const index = contacts.findIndex(c => c.id === id);
    if (
      (direction === 'up' && index > 0) ||
      (direction === 'down' && index < contacts.length - 1)
    ) {
      const newContacts = [...contacts];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [newContacts[index], newContacts[swapIndex]] = [newContacts[swapIndex], newContacts[index]];
      newContacts.forEach((c, i) => c.priority = i + 1);
      setContacts(newContacts);
    }
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
              緊急連絡先
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

        {/* 説明 */}
        <div style={{
          backgroundColor: '#e0e7ff',
          color: '#3730a3',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
        }}>
          📌 緊急時には優先度順に連絡を行います。優先度は上下ボタンで変更できます。
        </div>

        {/* 連絡先リスト */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#1f2937',
            }}>
              登録済み連絡先
            </h2>
            {!isAddingNew && (
              <button
                onClick={() => setIsAddingNew(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                + 追加
              </button>
            )}
          </div>

          {/* 連絡先一覧 */}
          {contacts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contacts.map((contact, index) => (
                <div
                  key={contact.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '15px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    gap: '15px',
                  }}
                >
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : '#6b7280',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px',
                  }}>
                    {contact.priority}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                      {contact.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {contact.relationship} • {contact.phone}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => handlePriorityChange(contact.id, 'up')}
                      disabled={index === 0}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: index === 0 ? '#e5e7eb' : '#f3f4f6',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handlePriorityChange(contact.id, 'down')}
                      disabled={index === contacts.length - 1}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: index === contacts.length - 1 ? '#e5e7eb' : '#f3f4f6',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: index === contacts.length - 1 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', textAlign: 'center' }}>
              連絡先が登録されていません
            </p>
          )}

          {/* 新規追加フォーム */}
          {isAddingNew && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '15px',
              }}>
                新規連絡先
              </h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="氏名"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  style={{
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="text"
                  placeholder="続柄（例：配偶者、息子、娘）"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  style={{
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <input
                  type="tel"
                  placeholder="電話番号"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  style={{
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewContact({ name: '', relationship: '', phone: '' });
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: 'white',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAdd}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    追加する
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const PersonalEmergencyContacts: React.FC = () => {
  return (
    <ProtectedRoute requiredUserType="individual">
      <PersonalEmergencyContactsContent />
    </ProtectedRoute>
  );
};

export default PersonalEmergencyContacts;