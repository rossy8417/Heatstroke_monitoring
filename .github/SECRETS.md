# GitHub Secrets 設定ガイド

このプロジェクトのGitHub Actionsを正しく動作させるために、以下のSecretsを設定する必要があります。

## 必須のSecrets

### Supabase関連
- `SUPABASE_ACCESS_TOKEN`: Supabaseのアクセストークン
- `SUPABASE_PROJECT_ID`: SupabaseプロジェクトのID

### デプロイ関連
- `PRODUCTION_API_URL`: 本番環境のAPI URL
- `DEPLOY_HOOK_URL`: デプロイフック（Vercel、Netlify等）

### Stripe関連
- `STRIPE_PUBLISHABLE_KEY`: Stripeの公開可能キー

### Vercel関連（Vercelを使用する場合）
- `VERCEL_TOKEN`: Vercelのアクセストークン
- `VERCEL_ORG_ID`: Vercelの組織ID
- `VERCEL_PROJECT_ID`: VercelのプロジェクトID

## オプションのSecrets

### 通知関連
- `SLACK_WEBHOOK`: Slack通知用のWebhook URL

## 設定方法

1. GitHubリポジトリの **Settings** タブを開く
2. 左側メニューから **Secrets and variables** → **Actions** を選択
3. **New repository secret** ボタンをクリック
4. Name欄にSecret名、Value欄に値を入力
5. **Add secret** ボタンをクリック

## ローカル開発用の.env.example

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_KEY=xxxxx

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+81xxxxxxxxx
TWILIO_WEBHOOK_URL=https://your-domain.com/webhooks/twilio
TWILIO_WEBHOOK_SECRET=xxxxx

# LINE
LINE_CHANNEL_ACCESS_TOKEN=xxxxx
LINE_CHANNEL_SECRET=xxxxx
LINE_CHANNEL_ID=xxxxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Stripe Price IDs
STRIPE_PRICE_BASIC=price_xxxxx
STRIPE_PRICE_PREMIUM=price_xxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxx
```

## セキュリティに関する注意事項

- Secretsは暗号化されて保存されます
- プルリクエストからのフォークではSecretsにアクセスできません
- ログにSecretが出力されないよう注意してください
- 定期的にトークンをローテーションすることを推奨します