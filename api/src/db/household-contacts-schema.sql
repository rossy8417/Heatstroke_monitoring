-- 緊急連絡先管理テーブル

-- 連絡先タイプの定義
CREATE TYPE contact_type AS ENUM ('family', 'caregiver', 'friend', 'neighbor', 'medical', 'facility_staff');

-- 緊急連絡先テーブル
CREATE TABLE IF NOT EXISTS household_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  
  -- 基本情報
  name VARCHAR(100) NOT NULL,
  relationship VARCHAR(100),
  contact_type contact_type NOT NULL DEFAULT 'family',
  
  -- 連絡先情報
  phone VARCHAR(20),
  line_user_id VARCHAR(100),
  email VARCHAR(255),
  address TEXT,
  
  -- 優先度・設定
  priority INTEGER DEFAULT 1, -- 1が最高優先
  is_emergency_contact BOOLEAN DEFAULT true,
  is_line_notifiable BOOLEAN DEFAULT false,
  is_sms_notifiable BOOLEAN DEFAULT false,
  is_call_notifiable BOOLEAN DEFAULT true,
  
  -- 利用可能時間
  available_hours JSONB DEFAULT '{"start": "08:00", "end": "22:00"}',
  available_days JSONB DEFAULT '["mon", "tue", "wed", "thu", "fri", "sat", "sun"]',
  
  -- メタデータ
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_household_contacts_household_id ON household_contacts(household_id);
CREATE INDEX IF NOT EXISTS idx_household_contacts_priority ON household_contacts(household_id, priority);
CREATE INDEX IF NOT EXISTS idx_household_contacts_active ON household_contacts(is_active, is_emergency_contact);

-- RLS（Row Level Security）
ALTER TABLE household_contacts ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは関連する世帯の連絡先のみ参照可能
CREATE POLICY "Users can view household contacts" ON household_contacts
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM user_households 
      WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage household contacts" ON household_contacts
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM user_households 
      WHERE user_id::text = auth.uid()::text 
      AND (relationship = 'owner' OR permissions->>'edit' = 'true')
    )
  );

-- デフォルトの緊急連絡先サンプル（開発用）
INSERT INTO household_contacts (household_id, name, relationship, contact_type, phone, priority, notes)
SELECT 
  h.id,
  '家族・' || h.name,
  '家族',
  'family',
  '+819087654321',
  1,
  '主たる緊急連絡先'
FROM households h
WHERE NOT EXISTS (
  SELECT 1 FROM household_contacts WHERE household_id = h.id
)
LIMIT 5;

-- トリガー: updated_at自動更新
CREATE OR REPLACE FUNCTION update_household_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_household_contacts_updated_at
  BEFORE UPDATE ON household_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_household_contacts_updated_at();