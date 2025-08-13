-- ユーザータイプ別モード管理のためのスキーマ拡張

-- ユーザータイプの定義
CREATE TYPE user_type AS ENUM ('individual', 'business', 'community', 'admin');

-- サブスクリプションプランの定義
CREATE TYPE subscription_plan AS ENUM ('free', 'personal', 'family', 'community', 'business', 'enterprise');

-- ユーザーテーブル（認証用）
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  user_type user_type NOT NULL DEFAULT 'individual',
  line_user_id VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ
);

-- サブスクリプション管理
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  plan subscription_plan NOT NULL DEFAULT 'free',
  stripe_customer_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active', -- active, canceled, past_due, trialing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- プラン制限
  max_households INTEGER DEFAULT 1,
  max_alerts_per_day INTEGER DEFAULT 10,
  max_contacts INTEGER DEFAULT 3,
  features JSONB DEFAULT '{}', -- 追加機能フラグ
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ユーザーと世帯の関連（個人ユーザー用）
CREATE TABLE IF NOT EXISTS user_households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  relationship VARCHAR(50), -- owner, family_member, caregiver
  permissions JSONB DEFAULT '{"view": true, "edit": false, "delete": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, household_id)
);

-- ユーザーとテナントの関連（団体ユーザー用）
CREATE TABLE IF NOT EXISTS user_tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'viewer', -- admin, manager, operator, viewer
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- LINE登録トークン（一時的な登録用）
CREATE TABLE IF NOT EXISTS registration_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token VARCHAR(100) UNIQUE NOT NULL,
  line_user_id VARCHAR(100),
  email VARCHAR(255),
  user_type user_type,
  metadata JSONB DEFAULT '{}',
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 料金プラン定義（マスターデータ）
CREATE TABLE IF NOT EXISTS pricing_plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly INTEGER, -- 円単位
  price_yearly INTEGER,
  stripe_price_id_monthly VARCHAR(100),
  stripe_price_id_yearly VARCHAR(100),
  
  -- 制限値
  max_households INTEGER,
  max_alerts_per_day INTEGER,
  max_contacts INTEGER,
  
  -- 機能フラグ
  features JSONB DEFAULT '{}',
  
  -- 表示順
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルトプランの挿入
INSERT INTO pricing_plans (id, name, description, price_monthly, price_yearly, max_households, max_alerts_per_day, max_contacts, features, display_order) VALUES
('free', '無料プラン', '個人利用向け', 0, 0, 1, 5, 2, '{"basic_alerts": true}', 1),
('personal', 'パーソナル', '1世帯の見守り', 500, 5000, 1, 50, 5, '{"basic_alerts": true, "weather_alerts": true, "line_notifications": true}', 2),
('family', 'ファミリー', '最大3世帯まで', 1500, 15000, 3, 150, 10, '{"basic_alerts": true, "weather_alerts": true, "line_notifications": true, "sms_notifications": true, "reports": true}', 3),
('community', 'コミュニティ', '町内会・自治会向け', 5000, 50000, 20, 500, 50, '{"all_features": true, "priority_support": true}', 4),
('business', 'ビジネス', '介護施設・事業者向け', 15000, 150000, 100, 2000, 200, '{"all_features": true, "api_access": true, "priority_support": true, "custom_branding": true}', 5),
('enterprise', 'エンタープライズ', 'カスタマイズ可能', NULL, NULL, NULL, NULL, NULL, '{"all_features": true, "custom": true}', 6)
ON CONFLICT (id) DO NOTHING;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_households_user_id ON user_households(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);

-- RLSポリシー
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の情報のみ参照可能
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- サブスクリプションは自分のもののみ参照可能
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (user_id::text = auth.uid()::text);

-- 世帯は権限があるもののみ参照可能
CREATE POLICY "Users can view permitted households" ON user_households
  FOR SELECT USING (user_id::text = auth.uid()::text);