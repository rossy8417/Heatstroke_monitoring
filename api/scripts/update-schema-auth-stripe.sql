-- =========================================
-- 認証・サブスクリプション関連のスキーマ更新
-- =========================================

-- 1. ユーザープロファイルテーブル（Supabase Auth連携）
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  user_type TEXT CHECK (user_type IN ('individual', 'business', 'community', 'admin')) DEFAULT 'individual',
  organization_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. サブスクリプションプランマスタ
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- 円単位
  stripe_price_id TEXT UNIQUE,
  user_type TEXT NOT NULL CHECK (user_type IN ('individual', 'business', 'community')),
  features JSONB NOT NULL DEFAULT '{}'::jsonb, -- プランの機能詳細
  max_households INTEGER,
  max_alerts_per_day INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ユーザーサブスクリプション
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')) DEFAULT 'trialing',
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- 1ユーザー1サブスクリプション
);

-- 4. 支払い履歴
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id),
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- 円単位
  currency TEXT DEFAULT 'jpy',
  status TEXT CHECK (status IN ('pending', 'paid', 'failed', 'refunded')) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 使用量制限トラッキング
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('households', 'alerts', 'api_calls')),
  usage_count INTEGER DEFAULT 0,
  limit_count INTEGER,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_type, period_start)
);

-- 6. 既存テーブルの更新：tenantsテーブルにサブスクリプション関連カラムを追加
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES user_subscriptions(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 7. 既存テーブルの更新：householdsテーブルにユーザー関連カラムを追加
ALTER TABLE households
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS managed_by_user_ids UUID[] DEFAULT '{}';

-- =========================================
-- インデックスの作成
-- =========================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_type ON user_profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON usage_tracking(user_id, period_start);

-- =========================================
-- RLS (Row Level Security) ポリシー
-- =========================================

-- user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- payment_history
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment history" ON payment_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payments" ON payment_history
  FOR ALL USING (auth.role() = 'service_role');

-- usage_tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage" ON usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- =========================================
-- トリガー関数
-- =========================================

-- updated_atを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- 初期データの投入
-- =========================================

-- サブスクリプションプランの初期データ
INSERT INTO subscription_plans (id, name, description, price, stripe_price_id, user_type, max_households, max_alerts_per_day, features)
VALUES 
  -- 個人・家族向け
  ('free', '無料プラン', '1世帯の見守りに', 0, NULL, 'individual', 1, 10, 
   '{"lineNotifications": true, "smsNotifications": false, "voiceCalls": false, "reports": false, "apiAccess": false, "support": "community"}'::jsonb),
  
  ('personal', 'パーソナル', '1世帯の充実した見守り', 500, 'price_personal_monthly', 'individual', 1, 50,
   '{"lineNotifications": true, "smsNotifications": true, "voiceCalls": true, "reports": true, "apiAccess": false, "support": "email"}'::jsonb),
  
  ('family', 'ファミリー', '最大3世帯まで見守り可能', 1200, 'price_family_monthly', 'individual', 3, 100,
   '{"lineNotifications": true, "smsNotifications": true, "voiceCalls": true, "reports": true, "apiAccess": false, "support": "email"}'::jsonb),
  
  -- 町内会・自治会向け
  ('community-basic', 'コミュニティベーシック', '小規模な地域見守り（〜10世帯）', 3000, 'price_community_basic_monthly', 'community', 10, 200,
   '{"lineNotifications": true, "smsNotifications": true, "voiceCalls": true, "reports": true, "apiAccess": false, "support": "email"}'::jsonb),
  
  ('community-standard', 'コミュニティスタンダード', '地域全体の見守り（〜20世帯）', 5000, 'price_community_standard_monthly', 'community', 20, 500,
   '{"lineNotifications": true, "smsNotifications": true, "voiceCalls": true, "reports": true, "apiAccess": true, "support": "priority"}'::jsonb),
  
  -- 介護施設・事業者向け
  ('business-starter', 'ビジネススターター', '小規模施設向け（〜30世帯）', 10000, 'price_business_starter_monthly', 'business', 30, 1000,
   '{"lineNotifications": true, "smsNotifications": true, "voiceCalls": true, "reports": true, "apiAccess": true, "support": "priority"}'::jsonb),
  
  ('business-pro', 'ビジネスプロ', '中規模施設向け（〜50世帯）', 20000, 'price_business_pro_monthly', 'business', 50, 2000,
   '{"lineNotifications": true, "smsNotifications": true, "voiceCalls": true, "reports": true, "apiAccess": true, "support": "priority"}'::jsonb),
  
  ('enterprise', 'エンタープライズ', '大規模施設・カスタム対応', -1, NULL, 'business', -1, -1,
   '{"lineNotifications": true, "smsNotifications": true, "voiceCalls": true, "reports": true, "apiAccess": true, "support": "priority"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =========================================
-- ヘルパー関数
-- =========================================

-- ユーザーの現在のプランを取得
CREATE OR REPLACE FUNCTION get_user_current_plan(p_user_id UUID)
RETURNS TABLE (
  plan_id TEXT,
  plan_name TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.name,
    us.status,
    us.current_period_end
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
    AND us.status IN ('trialing', 'active', 'past_due')
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ユーザーの使用量制限をチェック
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_user_id UUID,
  p_resource_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_usage_count INTEGER;
  v_limit_count INTEGER;
BEGIN
  SELECT usage_count, limit_count
  INTO v_usage_count, v_limit_count
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND resource_type = p_resource_type
    AND period_start <= CURRENT_DATE
    AND period_end >= CURRENT_DATE;
  
  IF NOT FOUND THEN
    RETURN TRUE; -- 記録がない場合は許可
  END IF;
  
  IF v_limit_count IS NULL OR v_limit_count = -1 THEN
    RETURN TRUE; -- 無制限
  END IF;
  
  RETURN v_usage_count < v_limit_count;
END;
$$ LANGUAGE plpgsql;

-- 使用量をインクリメント
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_resource_type TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, resource_type, usage_count, period_start, period_end)
  VALUES (p_user_id, p_resource_type, 1, DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')
  ON CONFLICT (user_id, resource_type, period_start)
  DO UPDATE SET 
    usage_count = usage_tracking.usage_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- コメント
-- =========================================

COMMENT ON TABLE user_profiles IS 'ユーザープロファイル情報';
COMMENT ON TABLE subscription_plans IS 'サブスクリプションプランマスタ';
COMMENT ON TABLE user_subscriptions IS 'ユーザーのサブスクリプション情報';
COMMENT ON TABLE payment_history IS '支払い履歴';
COMMENT ON TABLE usage_tracking IS '使用量制限トラッキング';

COMMENT ON COLUMN user_subscriptions.status IS 'trialing:トライアル中, active:有効, past_due:支払い遅延, canceled:キャンセル済み, unpaid:未払い';
COMMENT ON COLUMN payment_history.status IS 'pending:保留中, paid:支払い済み, failed:失敗, refunded:返金済み';
COMMENT ON COLUMN usage_tracking.resource_type IS 'households:世帯数, alerts:アラート数, api_calls:API呼び出し数';