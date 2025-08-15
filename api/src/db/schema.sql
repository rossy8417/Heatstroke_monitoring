-- Supabase用データベーススキーマ
-- 熱中症見守りシステム

-- テナント（自治体・組織）
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'municipality', -- municipality, family, etc
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 世帯情報
CREATE TABLE IF NOT EXISTS households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  address_grid VARCHAR(50), -- 地域メッシュコード
  address_text TEXT, -- 住所（テキスト）
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  risk_flag BOOLEAN DEFAULT false,
  consent_at TIMESTAMPTZ,
  consent_document_id VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを別途作成
CREATE INDEX IF NOT EXISTS idx_tenant_household ON households(tenant_id);
CREATE INDEX IF NOT EXISTS idx_phone ON households(phone);
CREATE INDEX IF NOT EXISTS idx_grid ON households(address_grid);

-- 連絡先（家族・近隣）
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- family, neighbor, staff
  priority INTEGER DEFAULT 1,
  name VARCHAR(255),
  phone VARCHAR(20),
  line_user_id VARCHAR(100),
  email VARCHAR(255),
  relationship VARCHAR(100), -- 息子、娘、隣人など
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを別途作成
CREATE INDEX IF NOT EXISTS idx_household_contacts ON contacts(household_id);
CREATE INDEX IF NOT EXISTS idx_line_user ON contacts(line_user_id);

-- アラート（当日の警戒情報）
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  level VARCHAR(20) NOT NULL, -- 注意, 警戒, 厳重警戒, 危険
  wbgt DECIMAL(5, 2), -- WBGT値
  status VARCHAR(20) DEFAULT 'open', -- open, ok, help, escalated, unanswered
  in_progress BOOLEAN DEFAULT false,
  first_trigger_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  closed_reason VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(household_id, date)
);

-- インデックスを別途作成
CREATE INDEX IF NOT EXISTS idx_household_date ON alerts(household_id, date);
CREATE INDEX IF NOT EXISTS idx_date_status ON alerts(date, status);

-- 通話ログ
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  call_id VARCHAR(100), -- 外部プロバイダのID
  attempt INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_sec INTEGER,
  result VARCHAR(20), -- ok, noanswer, busy, failed, help, tired
  dtmf VARCHAR(10), -- DTMFで入力された番号
  recording_url TEXT,
  provider VARCHAR(50), -- twilio, amazon_connect, etc
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを別途作成
CREATE INDEX IF NOT EXISTS idx_alert_calls ON call_logs(alert_id);
CREATE INDEX IF NOT EXISTS idx_household_calls ON call_logs(household_id);

-- 通知記録
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL, -- phone, sms, line, email
  recipient VARCHAR(255) NOT NULL, -- 送信先（電話番号、LINE ID等）
  template_id VARCHAR(50),
  content JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを別途作成
CREATE INDEX IF NOT EXISTS idx_alert_notifications ON notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_notification_status ON notifications(status);

-- 監査ログ
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor VARCHAR(255) NOT NULL, -- system, user_id, etc
  actor_type VARCHAR(50) DEFAULT 'system',
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(100) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  hash_chain VARCHAR(64), -- SHA256ハッシュチェーン
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを別途作成
CREATE INDEX IF NOT EXISTS idx_actor ON audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 既存のトリガーがあれば削除してから作成（冪等化）
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_households_updated_at ON households;
CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_alerts_updated_at ON alerts;
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) を有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ビュー：本日のアラートサマリー
CREATE OR REPLACE VIEW today_alerts_summary AS
SELECT 
  a.date,
  COUNT(DISTINCT a.household_id) as total_households,
  COUNT(CASE WHEN a.status = 'ok' THEN 1 END) as ok_count,
  COUNT(CASE WHEN a.status = 'unanswered' THEN 1 END) as unanswered_count,
  COUNT(CASE WHEN a.status = 'help' THEN 1 END) as help_count,
  COUNT(CASE WHEN a.status = 'escalated' THEN 1 END) as escalated_count,
  COUNT(CASE WHEN a.in_progress THEN 1 END) as in_progress_count
FROM alerts a
WHERE a.date = CURRENT_DATE
GROUP BY a.date;

-- 既存ビューを削除してから安定列で再作成（SELECT * を避ける）
DROP VIEW IF EXISTS household_details;
CREATE VIEW household_details AS
SELECT
  h.id,
  h.tenant_id,
  h.name,
  h.phone,
  h.address_grid,
  h.address_text,
  h.latitude,
  h.longitude,
  h.risk_flag,
  h.consent_at,
  h.consent_document_id,
  h.notes,
  h.is_active,
  h.created_at,
  h.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', c.id,
        'type', c.type,
        'priority', c.priority,
        'name', c.name,
        'phone', c.phone,
        'line_user_id', c.line_user_id,
        'relationship', c.relationship
      ) ORDER BY c.priority
    ) FILTER (WHERE c.id IS NOT NULL),
    '[]'::json
  ) AS contacts
FROM households h
LEFT JOIN contacts c ON h.id = c.household_id AND c.is_active = true
WHERE h.is_active = true
GROUP BY
  h.id,
  h.tenant_id,
  h.name,
  h.phone,
  h.address_grid,
  h.address_text,
  h.latitude,
  h.longitude,
  h.risk_flag,
  h.consent_at,
  h.consent_document_id,
  h.notes,
  h.is_active,
  h.created_at,
  h.updated_at;