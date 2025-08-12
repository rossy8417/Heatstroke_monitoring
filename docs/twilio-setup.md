# Twilioセットアップガイド

## 1. Twilioアカウント作成

1. **https://www.twilio.com/ja/try-twilio** にアクセス
2. 必要情報を入力：
   - メールアドレス
   - パスワード
   - 電話番号（SMS認証用）
3. 無料トライアル開始（$15相当のクレジット付与）

## 2. 認証情報の取得

### Twilioコンソールから取得
1. **https://console.twilio.com/** にログイン
2. ダッシュボードから以下をコピー：
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## 3. 日本の電話番号購入

### 番号の購入手順
1. **Phone Numbers** → **Manage** → **Buy a number**
2. **Country**: Japan を選択
3. **Capabilities**: Voice, SMS にチェック
4. 番号タイプを選択：
   - **050番号**: ¥500/月（推奨）
   - **03番号（東京）**: ¥1,500/月
   - **06番号（大阪）**: ¥1,500/月
5. 「Buy」をクリック

### 番号の設定
1. **Phone Numbers** → **Manage** → **Active Numbers**
2. 購入した番号をクリック
3. **Voice Configuration**:
   - **A CALL COMES IN**: Webhook
   - **URL**: `https://your-domain.com/webhooks/twilio/twiml`
   - **HTTP**: POST
4. 「Save Configuration」

## 4. 環境変数の設定

`.env`ファイルに以下を追加：

```bash
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+815012345678  # 購入した番号（国際形式）
TWILIO_WEBHOOK_URL=https://your-domain.com/webhooks/twilio
```

## 5. ngrokでローカルテスト（開発環境）

### ngrokのインストールと設定
```bash
# ngrokをダウンロード
# https://ngrok.com/download

# 起動
ngrok http 3000

# 表示されるURLをコピー
# 例: https://abc123.ngrok.io
```

### Twilioの設定を更新
1. Twilio Console → Phone Numbers → Active Numbers
2. Webhook URLを更新：
   - `https://abc123.ngrok.io/webhooks/twilio/twiml`

## 6. テスト方法

### APIサーバー起動
```bash
cd api
npm start
```

### テスト発信
```bash
# 電話発信テスト
curl -X POST http://localhost:3000/webhooks/twilio/test/call \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+819012345678",
    "name": "山田太郎",
    "alertId": "test_001"
  }'

# SMS送信テスト
curl -X POST http://localhost:3000/webhooks/twilio/test/sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+819012345678",
    "message": "熱中症にご注意ください"
  }'

# アカウント残高確認
curl http://localhost:3000/webhooks/twilio/account/balance
```

## 7. 本番環境設定

### ドメインの設定
1. 本番サーバーのドメインを取得
2. SSL証明書を設定（Let's Encrypt推奨）
3. Twilioコンソールで本番URLに更新

### セキュリティ設定
1. **Webhook署名検証**を有効化
2. **IP制限**（Twilioからのアクセスのみ許可）
3. **Rate Limiting**を設定

## 8. 料金の目安

### 日本での料金（2024年時点）
- **電話番号**: ¥500〜1,500/月
- **発信料金**: ¥10〜15/分
- **SMS送信**: ¥8〜10/通
- **着信料金**: ¥5〜10/分

### 予算管理
1. **Usage Triggers**を設定（使用量アラート）
2. **Spending Limits**を設定（上限設定）
3. **Auto-Recharge**は無効化推奨

## トラブルシューティング

### 発信できない
- 電話番号が正しい国際形式か確認（+81で始まる）
- アカウントがアクティブか確認
- 残高があるか確認

### 音声が日本語にならない
- `voice: 'Polly.Mizuki'`を指定
- `language: 'ja-JP'`を指定

### Webhookが届かない
- ngrokが起動しているか確認
- ファイアウォール設定を確認
- Twilioコンソールのデバッガーを確認

## 参考リンク

- [Twilio公式ドキュメント（日本語）](https://www.twilio.com/ja/docs)
- [TwiML リファレンス](https://www.twilio.com/docs/voice/twiml)
- [料金計算ツール](https://www.twilio.com/ja/pricing)
- [ステータスページ](https://status.twilio.com/)