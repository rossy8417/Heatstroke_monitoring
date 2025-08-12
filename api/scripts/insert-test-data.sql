-- Supabaseにテストデータを投入するSQL
-- このSQLをSupabaseのSQL Editorで実行してください

-- 1. テナント（必須）
INSERT INTO tenants (id, name, settings) VALUES 
('00000000-0000-0000-0000-000000000001', 'デフォルトテナント', '{"max_alerts_per_day": 100}')
ON CONFLICT (id) DO NOTHING;

-- 2. 世帯データ
INSERT INTO households (tenant_id, name, phone, address_grid, risk_flag, notes, is_active) VALUES 
('00000000-0000-0000-0000-000000000001', '田中太郎', '+819012345678', '5339-24', true, '心臓病あり、毎日薬を服用', true),
('00000000-0000-0000-0000-000000000001', '佐藤次郎', '+819023456789', '5339-25', false, '一人暮らし、近所に息子', true),
('00000000-0000-0000-0000-000000000001', '鈴木三郎', '+819034567890', '5339-26', true, '糖尿病、足が不自由', true),
('00000000-0000-0000-0000-000000000001', '高橋四郎', '+819045678901', '5339-27', false, '元気だが高齢', true),
('00000000-0000-0000-0000-000000000001', '渡辺五郎', '+819056789012', '5339-28', true, '認知症の疑い、要注意', true)
ON CONFLICT DO NOTHING;

-- 3. 連絡先データ（世帯IDを取得して挿入）
WITH household_ids AS (
  SELECT id, name FROM households WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
)
INSERT INTO contacts (household_id, type, priority, name, phone, relationship) 
SELECT 
  h.id, 
  c.type, 
  c.priority, 
  c.name, 
  c.phone, 
  c.relationship
FROM household_ids h
CROSS JOIN LATERAL (
  VALUES 
    (h.name, 'family', 1, 
     CASE h.name 
       WHEN '田中太郎' THEN '田中花子'
       WHEN '佐藤次郎' THEN '佐藤一郎'
       WHEN '鈴木三郎' THEN '鈴木美子'
       WHEN '高橋四郎' THEN '高橋孝子'
       WHEN '渡辺五郎' THEN '渡辺健太'
     END,
     CASE h.name 
       WHEN '田中太郎' THEN '+819012345679'
       WHEN '佐藤次郎' THEN '+819023456790'
       WHEN '鈴木三郎' THEN '+819034567891'
       WHEN '高橋四郎' THEN '+819045678902'
       WHEN '渡辺五郎' THEN '+819056789013'
     END,
     CASE h.name 
       WHEN '田中太郎' THEN '娘'
       WHEN '佐藤次郎' THEN '息子'
       WHEN '鈴木三郎' THEN '妻'
       WHEN '高橋四郎' THEN '娘'
       WHEN '渡辺五郎' THEN '息子'
     END
    )
) AS c(household_name, type, priority, name, phone, relationship)
WHERE h.name = c.household_name
ON CONFLICT DO NOTHING;

-- 追加の連絡先（鈴木三郎と渡辺五郎）
INSERT INTO contacts (household_id, type, priority, name, phone, relationship)
SELECT id, 'neighbor', 2, '山田隣人', '+819034567892', '隣人'
FROM households WHERE name = '鈴木三郎' AND tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

INSERT INTO contacts (household_id, type, priority, name, phone, relationship)
SELECT id, 'care_manager', 2, '介護支援センター', '+819056789014', 'ケアマネージャー'
FROM households WHERE name = '渡辺五郎' AND tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

-- 4. 今日のアラートデータ
WITH household_sample AS (
  SELECT id, name, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM households 
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  LIMIT 3
)
INSERT INTO alerts (household_id, date, level, wbgt, status, first_trigger_at, in_progress, closed_at)
SELECT 
  id,
  CURRENT_DATE,
  CASE rn 
    WHEN 1 THEN '警戒'
    WHEN 2 THEN '厳重警戒'
    WHEN 3 THEN '危険'
  END as level,
  CASE rn 
    WHEN 1 THEN 29.2
    WHEN 2 THEN 31.5
    WHEN 3 THEN 32.8
  END as wbgt,
  CASE rn 
    WHEN 1 THEN 'unanswered'
    WHEN 2 THEN 'ok'
    WHEN 3 THEN 'help'
  END as status,
  NOW() - INTERVAL '1 hour' * rn as first_trigger_at,
  CASE rn WHEN 3 THEN true ELSE false END as in_progress,
  CASE 
    WHEN rn = 2 THEN NOW() - INTERVAL '30 minutes'
    ELSE NULL
  END as closed_at
FROM household_sample
ON CONFLICT DO NOTHING;

-- 5. 通話ログ
WITH alert_sample AS (
  SELECT a.id as alert_id, a.household_id, a.status,
         ROW_NUMBER() OVER (ORDER BY a.created_at) as rn
  FROM alerts a
  WHERE a.date = CURRENT_DATE
  LIMIT 3
)
INSERT INTO call_logs (alert_id, household_id, call_id, attempt, result, duration_sec, dtmf)
SELECT 
  alert_id,
  household_id,
  'CALL_' || gen_random_uuid()::text,
  1,
  CASE status
    WHEN 'ok' THEN 'ok'
    WHEN 'unanswered' THEN 'noanswer'
    WHEN 'help' THEN 'help'
  END as result,
  CASE status
    WHEN 'ok' THEN 45
    WHEN 'unanswered' THEN 0
    WHEN 'help' THEN 30
  END as duration_sec,
  CASE status
    WHEN 'ok' THEN '1'
    WHEN 'help' THEN '3'
    ELSE NULL
  END as dtmf
FROM alert_sample
WHERE status != 'open'
ON CONFLICT DO NOTHING;

-- 6. 確認：データ件数
SELECT 
  (SELECT COUNT(*) FROM households WHERE tenant_id = '00000000-0000-0000-0000-000000000001') as households_count,
  (SELECT COUNT(*) FROM contacts) as contacts_count,
  (SELECT COUNT(*) FROM alerts WHERE date = CURRENT_DATE) as today_alerts_count,
  (SELECT COUNT(*) FROM call_logs) as call_logs_count;

-- 7. 今日のアラートサマリー
SELECT 
  COUNT(CASE WHEN status = 'ok' THEN 1 END) as ok,
  COUNT(CASE WHEN status = 'unanswered' THEN 1 END) as unanswered,
  COUNT(CASE WHEN status = 'tired' THEN 1 END) as tired,
  COUNT(CASE WHEN status = 'help' THEN 1 END) as help,
  COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open
FROM alerts 
WHERE date = CURRENT_DATE;