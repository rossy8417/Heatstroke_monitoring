-- ===================================
-- 本番環境用 RLS (Row Level Security) 設定
-- ===================================

-- RLSを有効化
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ===================================
-- 1. households テーブルのポリシー
-- ===================================

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Service role can do everything" ON households;
DROP POLICY IF EXISTS "Authenticated users can view own households" ON households;
DROP POLICY IF EXISTS "Authenticated users can update own households" ON households;

-- サービスロール用（システム管理）
CREATE POLICY "Service role full access" ON households
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 認証済みユーザー：自分のテナントの世帯のみ表示
CREATE POLICY "Users can view tenant households" ON households
  FOR SELECT
  TO authenticated
  USING (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    OR 
    auth.jwt() ->> 'role' = 'admin'
  );

-- 認証済みユーザー：自分のテナントの世帯のみ作成
CREATE POLICY "Users can create tenant households" ON households
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    OR 
    auth.jwt() ->> 'role' = 'admin'
  );

-- 認証済みユーザー：自分のテナントの世帯のみ更新
CREATE POLICY "Users can update tenant households" ON households
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    OR 
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    OR 
    auth.jwt() ->> 'role' = 'admin'
  );

-- 管理者のみ削除可能
CREATE POLICY "Only admins can delete households" ON households
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- ===================================
-- 2. alerts テーブルのポリシー
-- ===================================

DROP POLICY IF EXISTS "Service role can do everything" ON alerts;
DROP POLICY IF EXISTS "Authenticated users can view alerts" ON alerts;

-- サービスロール用
CREATE POLICY "Service role full access" ON alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 認証済みユーザー：自分のテナントのアラートのみ表示
CREATE POLICY "Users can view tenant alerts" ON alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM households h
      WHERE h.id = alerts.household_id
      AND (
        h.tenant_id::text = auth.jwt() ->> 'tenant_id'
        OR 
        auth.jwt() ->> 'role' = 'admin'
      )
    )
  );

-- システムのみがアラートを作成可能
CREATE POLICY "System creates alerts" ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'system')
  );

-- アラートの更新は管理者とシステムのみ
CREATE POLICY "Admin/System updates alerts" ON alerts
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('admin', 'system')
  )
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'system')
  );

-- ===================================
-- 3. call_logs テーブルのポリシー
-- ===================================

DROP POLICY IF EXISTS "Service role can do everything" ON call_logs;
DROP POLICY IF EXISTS "Authenticated users can view call logs" ON call_logs;

-- サービスロール用
CREATE POLICY "Service role full access" ON call_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 認証済みユーザー：関連するアラートが見える場合のみ表示
CREATE POLICY "Users can view related call logs" ON call_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM alerts a
      JOIN households h ON h.id = a.household_id
      WHERE a.id = call_logs.alert_id
      AND (
        h.tenant_id::text = auth.jwt() ->> 'tenant_id'
        OR 
        auth.jwt() ->> 'role' = 'admin'
      )
    )
  );

-- システムのみが通話ログを作成
CREATE POLICY "System creates call logs" ON call_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'system')
  );

-- ===================================
-- 4. notifications テーブルのポリシー
-- ===================================

DROP POLICY IF EXISTS "Service role can do everything" ON notifications;

-- サービスロール用
CREATE POLICY "Service role full access" ON notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 認証済みユーザー：関連するアラートが見える場合のみ表示
CREATE POLICY "Users can view related notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM alerts a
      JOIN households h ON h.id = a.household_id
      WHERE a.id = notifications.alert_id
      AND (
        h.tenant_id::text = auth.jwt() ->> 'tenant_id'
        OR 
        auth.jwt() ->> 'role' = 'admin'
      )
    )
  );

-- システムのみが通知を作成
CREATE POLICY "System creates notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'system')
  );

-- ===================================
-- 5. contacts テーブルのポリシー
-- ===================================

DROP POLICY IF EXISTS "Service role can do everything" ON contacts;

-- サービスロール用
CREATE POLICY "Service role full access" ON contacts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 認証済みユーザー：自分のテナントの連絡先のみ表示
CREATE POLICY "Users can view tenant contacts" ON contacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM households h
      WHERE h.id = contacts.household_id
      AND (
        h.tenant_id::text = auth.jwt() ->> 'tenant_id'
        OR 
        auth.jwt() ->> 'role' = 'admin'
      )
    )
  );

-- 認証済みユーザー：自分のテナントの連絡先のみ作成・更新
CREATE POLICY "Users can manage tenant contacts" ON contacts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM households h
      WHERE h.id = contacts.household_id
      AND (
        h.tenant_id::text = auth.jwt() ->> 'tenant_id'
        OR 
        auth.jwt() ->> 'role' = 'admin'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM households h
      WHERE h.id = contacts.household_id
      AND (
        h.tenant_id::text = auth.jwt() ->> 'tenant_id'
        OR 
        auth.jwt() ->> 'role' = 'admin'
      )
    )
  );

-- ===================================
-- 6. audit_logs テーブルのポリシー（読み取り専用）
-- ===================================

DROP POLICY IF EXISTS "Service role can do everything" ON audit_logs;

-- サービスロール用
CREATE POLICY "Service role full access" ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 管理者のみが監査ログを閲覧可能
CREATE POLICY "Only admins can view audit logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- システムのみが監査ログを作成
CREATE POLICY "System creates audit logs" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('admin', 'system')
  );

-- ===================================
-- インデックスの作成（パフォーマンス向上）
-- ===================================

-- tenant_id でのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_households_tenant_id ON households(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_household_id ON alerts(household_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_alert_id ON call_logs(alert_id);
CREATE INDEX IF NOT EXISTS idx_notifications_alert_id ON notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_contacts_household_id ON contacts(household_id);

-- 日付ベースのクエリを高速化
CREATE INDEX IF NOT EXISTS idx_alerts_date ON alerts(date);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ステータスでのフィルタリングを高速化
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- ===================================
-- RLS設定の確認
-- ===================================

-- RLSが有効になっているテーブルを確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('households', 'alerts', 'call_logs', 'notifications', 'contacts', 'audit_logs');

-- 各テーブルのポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;