-- ===================================
-- 本番環境用 RLS (Row Level Security) 設定
-- UUID型の比較エラーを回避するバージョン
-- ===================================

-- テーブルの型を確認
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('households', 'alerts', 'call_logs', 'notifications', 'contacts')
  AND column_name IN ('id', 'tenant_id', 'household_id', 'alert_id');

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
DROP POLICY IF EXISTS "Service role full access" ON households;
DROP POLICY IF EXISTS "Users can view tenant households" ON households;
DROP POLICY IF EXISTS "Users can create tenant households" ON households;
DROP POLICY IF EXISTS "Users can update tenant households" ON households;
DROP POLICY IF EXISTS "Only admins can delete households" ON households;
DROP POLICY IF EXISTS "Authenticated users can view own households" ON households;
DROP POLICY IF EXISTS "Authenticated users can update own households" ON households;

-- サービスロール用（システム管理）
CREATE POLICY "Service role full access" ON households
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 認証済みユーザー：自分のテナントの世帯のみ表示
-- COALESCE を使用してNULLを安全に処理
CREATE POLICY "Users can view tenant households" ON households
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(tenant_id::text, '') = COALESCE(auth.jwt() ->> 'tenant_id', '')
    OR 
    COALESCE(auth.jwt() ->> 'role', '') = 'admin'
  );

-- 認証済みユーザー：自分のテナントの世帯のみ作成
CREATE POLICY "Users can create tenant households" ON households
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(tenant_id::text, '') = COALESCE(auth.jwt() ->> 'tenant_id', '')
    OR 
    COALESCE(auth.jwt() ->> 'role', '') = 'admin'
  );

-- 認証済みユーザー：自分のテナントの世帯のみ更新
CREATE POLICY "Users can update tenant households" ON households
  FOR UPDATE
  TO authenticated
  USING (
    COALESCE(tenant_id::text, '') = COALESCE(auth.jwt() ->> 'tenant_id', '')
    OR 
    COALESCE(auth.jwt() ->> 'role', '') = 'admin'
  )
  WITH CHECK (
    COALESCE(tenant_id::text, '') = COALESCE(auth.jwt() ->> 'tenant_id', '')
    OR 
    COALESCE(auth.jwt() ->> 'role', '') = 'admin'
  );

-- 管理者のみ削除可能
CREATE POLICY "Only admins can delete households" ON households
  FOR DELETE
  TO authenticated
  USING (COALESCE(auth.jwt() ->> 'role', '') = 'admin');

-- ===================================
-- 2. alerts テーブルのポリシー
-- ===================================

DROP POLICY IF EXISTS "Service role can do everything" ON alerts;
DROP POLICY IF EXISTS "Service role full access" ON alerts;
DROP POLICY IF EXISTS "Users can view tenant alerts" ON alerts;
DROP POLICY IF EXISTS "System creates alerts" ON alerts;
DROP POLICY IF EXISTS "Admin/System updates alerts" ON alerts;
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
        COALESCE(h.tenant_id::text, '') = COALESCE(auth.jwt() ->> 'tenant_id', '')
        OR 
        COALESCE(auth.jwt() ->> 'role', '') = 'admin'
      )
    )
  );

-- システムのみがアラートを作成可能
CREATE POLICY "System creates alerts" ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(auth.jwt() ->> 'role', '') IN ('admin', 'system')
  );

-- アラートの更新は管理者とシステムのみ
CREATE POLICY "Admin/System updates alerts" ON alerts
  FOR UPDATE
  TO authenticated
  USING (
    COALESCE(auth.jwt() ->> 'role', '') IN ('admin', 'system')
  )
  WITH CHECK (
    COALESCE(auth.jwt() ->> 'role', '') IN ('admin', 'system')
  );

-- ===================================
-- 簡易的な開発環境用設定（RLS無効化）
-- ===================================
-- 開発環境で使用する場合は以下のコメントを外してください
-- ALTER TABLE households DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE call_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;