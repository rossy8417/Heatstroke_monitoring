-- statusがin_progressになってしまっているアラートを修正
-- in_progressはフラグであって、statusではない

-- 現在の状態を確認
SELECT id, status, in_progress 
FROM alerts 
WHERE date = CURRENT_DATE;

-- statusがin_progressになっているものを修正
-- 元のstatusは不明なので、unansweredに戻す
UPDATE alerts 
SET status = 'unanswered'
WHERE status = 'in_progress' 
  AND date = CURRENT_DATE;

-- 修正後の確認
SELECT id, status, in_progress 
FROM alerts 
WHERE date = CURRENT_DATE;