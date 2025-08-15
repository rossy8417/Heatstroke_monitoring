-- Row Level Security (RLS) ポリシーを設定
-- サービスロールキーを使用する場合はRLSをバイパスできますが、
-- anonキーを使用する場合は適切なポリシーが必要です

-- まず既存のポリシーを削除
DROP POLICY IF EXISTS "Enable all for service role" ON tenants;
DROP POLICY IF EXISTS "Enable all for service role" ON households;
DROP POLICY IF EXISTS "Enable all for service role" ON contacts;
DROP POLICY IF EXISTS "Enable all for service role" ON alerts;
DROP POLICY IF EXISTS "Enable all for service role" ON call_logs;
DROP POLICY IF EXISTS "Enable all for service role" ON notifications;
DROP POLICY IF EXISTS "Enable all for service role" ON audit_logs;

DROP POLICY IF EXISTS "Enable read for anon" ON tenants;
DROP POLICY IF EXISTS "Enable read for anon" ON households;
DROP POLICY IF EXISTS "Enable read for anon" ON contacts;
DROP POLICY IF EXISTS "Enable read for anon" ON alerts;
DROP POLICY IF EXISTS "Enable read for anon" ON call_logs;
DROP POLICY IF EXISTS "Enable read for anon" ON notifications;
DROP POLICY IF EXISTS "Enable read for anon" ON audit_logs;

-- 追加：開発用anonポリシーの重複を除去
DROP POLICY IF EXISTS "Enable insert for anon" ON households;
DROP POLICY IF EXISTS "Enable update for anon" ON households;
DROP POLICY IF EXISTS "Enable delete for anon" ON households;

DROP POLICY IF EXISTS "Enable insert for anon" ON alerts;
DROP POLICY IF EXISTS "Enable update for anon" ON alerts;

DROP POLICY IF EXISTS "Enable insert for anon" ON contacts;
DROP POLICY IF EXISTS "Enable update for anon" ON contacts;
DROP POLICY IF EXISTS "Enable delete for anon" ON contacts;

DROP POLICY IF EXISTS "Enable insert for anon" ON call_logs;

DROP POLICY IF EXISTS "Enable insert for anon" ON notifications;
DROP POLICY IF EXISTS "Enable update for anon" ON notifications;

-- RLSを有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 全てのテーブルに対して、service roleは全ての操作を許可
CREATE POLICY "Enable all for service role" ON tenants
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON households
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON contacts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON alerts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON call_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON notifications
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable all for service role" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- anonロールに対しては読み取りのみ許可（開発用）
CREATE POLICY "Enable read for anon" ON tenants
  FOR SELECT USING (true);

CREATE POLICY "Enable read for anon" ON households
  FOR SELECT USING (true);

CREATE POLICY "Enable read for anon" ON contacts
  FOR SELECT USING (true);

CREATE POLICY "Enable read for anon" ON alerts
  FOR SELECT USING (true);

CREATE POLICY "Enable read for anon" ON call_logs
  FOR SELECT USING (true);

CREATE POLICY "Enable read for anon" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "Enable read for anon" ON audit_logs
  FOR SELECT USING (true);

-- anonロールに対して書き込みも許可（開発用）
CREATE POLICY "Enable insert for anon" ON households
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for anon" ON households
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for anon" ON households
  FOR DELETE USING (true);

CREATE POLICY "Enable insert for anon" ON alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for anon" ON alerts
  FOR UPDATE USING (true);

CREATE POLICY "Enable insert for anon" ON contacts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for anon" ON contacts
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for anon" ON contacts
  FOR DELETE USING (true);

CREATE POLICY "Enable insert for anon" ON call_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable insert for anon" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for anon" ON notifications
  FOR UPDATE USING (true);

-- 確認
SELECT 
  schemaname,
  tablename, 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('tenants', 'households', 'contacts', 'alerts', 'call_logs', 'notifications', 'audit_logs')
ORDER BY tablename, policyname;