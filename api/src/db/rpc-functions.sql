-- ================================
-- RPC関数定義
-- ================================

-- アラートのメタデータを安全にマージする関数
CREATE OR REPLACE FUNCTION update_alert_metadata(
  alert_id UUID,
  metadata_updates JSONB
)
RETURNS TABLE(
  id UUID,
  household_id UUID,
  date DATE,
  level VARCHAR(50),
  wbgt DECIMAL(4,1),
  status VARCHAR(50),
  in_progress BOOLEAN,
  first_trigger_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closed_reason VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- メタデータをマージして更新
  UPDATE alerts
  SET 
    metadata = COALESCE(metadata, '{}'::jsonb) || metadata_updates,
    updated_at = NOW()
  WHERE alerts.id = alert_id;
  
  -- 更新されたレコードを返す（householdとJOIN）
  RETURN QUERY
  SELECT 
    a.id,
    a.household_id,
    a.date,
    a.level,
    a.wbgt,
    a.status,
    a.in_progress,
    a.first_trigger_at,
    a.closed_at,
    a.closed_reason,
    a.metadata,
    a.created_at,
    a.updated_at
  FROM alerts a
  WHERE a.id = alert_id;
END;
$$;

-- 今日のアラートサマリーを取得する関数
CREATE OR REPLACE FUNCTION get_today_alerts_summary()
RETURNS TABLE(
  ok_count BIGINT,
  unanswered_count BIGINT,
  tired_count BIGINT,
  help_count BIGINT,
  escalated_count BIGINT,
  in_progress_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'ok') AS ok_count,
    COUNT(*) FILTER (WHERE status = 'unanswered') AS unanswered_count,
    COUNT(*) FILTER (WHERE status = 'tired') AS tired_count,
    COUNT(*) FILTER (WHERE status = 'help') AS help_count,
    COUNT(*) FILTER (WHERE status = 'escalated') AS escalated_count,
    COUNT(*) FILTER (WHERE in_progress = true) AS in_progress_count
  FROM alerts
  WHERE date = CURRENT_DATE;
END;
$$;

-- 世帯の最新アラートを取得する関数
CREATE OR REPLACE FUNCTION get_household_latest_alert(
  p_household_id UUID
)
RETURNS TABLE(
  id UUID,
  household_id UUID,
  date DATE,
  level VARCHAR(50),
  wbgt DECIMAL(4,1),
  status VARCHAR(50),
  in_progress BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.household_id,
    a.date,
    a.level,
    a.wbgt,
    a.status,
    a.in_progress,
    a.metadata,
    a.created_at
  FROM alerts a
  WHERE a.household_id = p_household_id
  ORDER BY a.created_at DESC
  LIMIT 1;
END;
$$;

-- 通話ログを整形して返す関数
CREATE OR REPLACE FUNCTION get_formatted_call_logs(
  p_alert_id UUID
)
RETURNS TABLE(
  call_id VARCHAR(100),
  alert_id UUID,
  household_id UUID,
  attempt INTEGER,
  result VARCHAR(50),
  response_code VARCHAR(10),
  duration_seconds INTEGER,
  provider VARCHAR(50),
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.call_id,
    cl.alert_id,
    cl.household_id,
    cl.attempt,
    cl.result,
    cl.response_code,
    cl.duration_seconds,
    cl.provider,
    cl.created_at
  FROM call_logs cl
  WHERE cl.alert_id = p_alert_id
  ORDER BY cl.created_at DESC;
END;
$$;

-- アラートのステータス履歴を記録する関数
CREATE OR REPLACE FUNCTION record_alert_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- ステータスが変更された場合
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO alert_status_history (
      alert_id,
      old_status,
      new_status,
      changed_at,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NOW(),
      COALESCE(current_setting('app.current_user', true), 'system')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ステータス変更トリガー（テーブルが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alert_status_history') THEN
    DROP TRIGGER IF EXISTS alert_status_change_trigger ON alerts;
    CREATE TRIGGER alert_status_change_trigger
    AFTER UPDATE OF status ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION record_alert_status_change();
  END IF;
END $$;

-- 権限設定
GRANT EXECUTE ON FUNCTION update_alert_metadata TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_today_alerts_summary TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_household_latest_alert TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_formatted_call_logs TO anon, authenticated, service_role;