# Twilio設定ガイド

## 現在の状態
- ✅ Twilioアカウント: 有料プランにアップグレード済み
- ✅ 電話番号: +17744366338（米国番号）
- ✅ 日本への発信: 可能
- ⚠️ Webhook URL: 未設定（ローカルテスト用にTwiML直接送信を使用中）

## Webhook URLの設定方法

### 開発環境

#### 方法1: ngrok（推奨）
```bash
# 1. ngrokをインストール
npm install -g ngrok

# 2. APIサーバーを起動（別ターミナル）
npm run dev

# 3. ngrokでトンネルを作成
ngrok http 3000

# 4. 表示されたURLをコピー
# 例: https://abc123.ngrok.io

# 5. .envファイルを更新
TWILIO_WEBHOOK_URL=https://abc123.ngrok.io/webhooks/twilio
```

#### 方法2: localtunnel
```bash
# 1. localtunnelをインストール
npm install -g localtunnel

# 2. トンネルを作成
lt --port 3000

# 3. 表示されたURLを.envに設定
```

### 本番環境

#### 方法1: Vercel
```bash
# 1. Vercelにデプロイ
vercel

# 2. デプロイされたURLを.envに設定
TWILIO_WEBHOOK_URL=https://your-app.vercel.app/webhooks/twilio
```

#### 方法2: Heroku
```bash
# 1. Herokuにデプロイ
heroku create your-app-name
git push heroku main

# 2. 環境変数を設定
heroku config:set TWILIO_WEBHOOK_URL=https://your-app-name.herokuapp.com/webhooks/twilio
```

## 番号入力後の処理

現在の実装では、番号入力により以下の処理が行われます：

- **1番（大丈夫）**: アラートを「ok」として記録
- **2番（疲れている）**: アラートを「tired」として記録、後で確認
- **3番（助けが必要）**: アラートを「help」として記録、家族に緊急連絡

## 日本の電話番号取得（将来）

### 050番号の取得方法
1. Twilioコンソールで「Phone Numbers」→「Buy a Number」
2. 国で「Japan」を選択
3. 「Voice」機能を有効にして検索
4. 050番号を購入（月額約1,000円）

### 注意事項
- 050番号は音声通話のみ（SMSは別途03番号が必要）
- 本人確認書類の提出が必要な場合あり
- 法人利用の場合は追加書類が必要

## トラブルシューティング

### 電話がかからない場合
1. Twilioの残高を確認
2. 電話番号の形式を確認（+81で始まる国際形式）
3. Twilioコンソールでエラーログを確認

### 番号入力が反映されない場合
- Webhook URLが正しく設定されているか確認
- ngrokが起動しているか確認
- APIサーバーが起動しているか確認