import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { householdsApi } from '../lib/api';
import { ProtectedRoute } from '../components/ProtectedRoute';

function HouseholdsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHousehold, setEditingHousehold] = useState<any>(null);

  const { data: households, isLoading } = useQuery({
    queryKey: ['households', searchQuery],
    queryFn: () => householdsApi.search(searchQuery),
  });

  const createMutation = useMutation({
    mutationFn: householdsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      setIsAddModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: any) => householdsApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
      setEditingHousehold(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: householdsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const household = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      address_grid: formData.get('address_grid'),
      risk_flag: formData.get('risk_flag') === 'on',
      notes: formData.get('notes'),
    };

    if (editingHousehold) {
      updateMutation.mutate({ id: editingHousehold.id, updates: household });
    } else {
      createMutation.mutate(household);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 24px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                textDecoration: 'none',
                cursor: 'pointer',
                fontSize: 'inherit',
                padding: 0,
              }}
            >
              ← ダッシュボード
            </button>
            <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', margin: 0 }}>
              世帯管理
            </h1>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* 検索バー */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="名前、電話番号、住所で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              + 新規登録
            </button>
          </div>
        </div>

        {/* 世帯リスト */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              読み込み中...
            </div>
          ) : households && households.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>名前</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>電話番号</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>住所グリッド</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>リスク</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>備考</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {households.map((household: any) => (
                    <tr key={household.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>
                        {household.name}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {household.phone}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {household.address_grid || '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {household.risk_flag ? (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                          }}>
                            高リスク
                          </span>
                        ) : (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: '#d1fae5',
                            color: '#065f46',
                          }}>
                            通常
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                        {household.notes ? (
                          <span title={household.notes}>
                            {household.notes.length > 20 ? household.notes.substring(0, 20) + '...' : household.notes}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setEditingHousehold(household)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                            }}
                          >
                            編集
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`${household.name}を削除しますか？`)) {
                                deleteMutation.mutate(household.id);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                            }}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              世帯が登録されていません
            </div>
          )}
        </div>
      </div>

      {/* モーダル */}
      {(isAddModalOpen || editingHousehold) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
              {editingHousehold ? '世帯情報を編集' : '新規世帯登録'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  名前 *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingHousehold?.name}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  電話番号 *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="+819012345678"
                  defaultValue={editingHousehold?.phone}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  住所グリッド
                </label>
                <input
                  type="text"
                  name="address_grid"
                  placeholder="5339-24"
                  defaultValue={editingHousehold?.address_grid}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '500' }}>
                  <input
                    type="checkbox"
                    name="risk_flag"
                    defaultChecked={editingHousehold?.risk_flag}
                    style={{ marginRight: '8px' }}
                  />
                  高リスク対象者
                </label>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  備考
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={editingHousehold?.notes}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingHousehold(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    opacity: (createMutation.isPending || updateMutation.isPending) ? 0.5 : 1,
                  }}
                >
                  {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Households() {
  return (
    <ProtectedRoute>
      <HouseholdsContent />
    </ProtectedRoute>
  );
}