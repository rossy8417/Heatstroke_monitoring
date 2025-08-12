-- データベースの実際のデータを確認

-- 1. 今日のアラートデータ
SELECT 
  id,
  household_id,
  status,
  level,
  wbgt,
  in_progress,
  date
FROM alerts 
WHERE date = CURRENT_DATE
ORDER BY created_at;

-- 2. ステータスごとの集計
SELECT 
  status,
  COUNT(*) as count
FROM alerts 
WHERE date = CURRENT_DATE
GROUP BY status;

-- 3. 世帯の一覧
SELECT 
  id,
  name,
  phone,
  risk_flag
FROM households 
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ORDER BY created_at;

-- 4. ビューの結果（もし存在すれば）
SELECT * FROM today_alerts_summary;