-- テスト用の世帯データを作成
INSERT INTO households (id, tenant_id, name, phone, emergency_contact, health_conditions, grid_square, created_at, updated_at)
VALUES 
  ('test-household-1', 'default', 'テスト太郎', '+81901234567', '+81909876543', '高血圧', '5339-24', NOW(), NOW()),
  ('test-household-2', 'default', 'テスト花子', '+81901112222', '+81903334444', '糖尿病', '5339-24', NOW(), NOW())
ON CONFLICT (id) DO UPDATE 
SET updated_at = NOW();

-- テスト用のアラートデータを作成（未応答と要注意）
INSERT INTO alerts (id, household_id, status, wbgt, level, metadata, created_at, updated_at)
VALUES 
  (
    'test-alert-1',
    'test-household-1',
    'unanswered',
    28.5,
    '厳重警戒',
    '{"attempts": 1, "lastCallAt": "2025-08-15T18:00:00Z", "lastResponseCode": "no_answer"}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'test-alert-2',
    'test-household-2',
    'tired',
    27.0,
    '警戒',
    '{"attempts": 2, "lastCallAt": "2025-08-15T18:30:00Z", "lastResponseCode": "2"}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE 
SET 
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();