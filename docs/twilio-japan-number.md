# Twilio日本番号購入ガイド

## なぜ日本の番号が必要か

- **信頼性**: 日本の番号（050/03/06）なら安心して電話に出てもらえる
- **法的要件**: 日本での商用利用には日本の番号が推奨される
- **高齢者対応**: 国際番号は詐欺と誤解される

## 購入手順

### 1. Twilioコンソールにログイン
https://console.twilio.com/

### 2. Phone Numbers → Buy a Number
https://console.twilio.com/develop/phone-numbers/manage/search

### 3. 設定
- **Country**: Japan
- **Capabilities**: ✅ Voice, ✅ SMS
- **Number Type**:
  - **Mobile (050)**: ¥600-800/月（推奨）
  - **Local (03)**: ¥1,500/月（東京）
  - **Local (06)**: ¥1,500/月（大阪）

### 4. 番号を選んで購入
- 「Buy」をクリック
- 月額課金されます

## もし購入できない場合

### Regulatory Compliance（規制対応）が必要

1. **Settings → Regulatory Compliance**
2. **Create New Bundle**
3. 必要書類：
   - 身分証明書（パスポート等）
   - 住所証明（公共料金請求書等）
   - 用途説明

### 代替案

1. **Twilio Flex** を使用（コールセンター向けサービス）
2. **別の電話APIサービス**:
   - **Vonage（旧Nexmo）**: 日本番号取得が簡単
   - **Amazon Connect**: AWS統合
   - **IVRy（アイブリー）**: 日本特化型

## 推奨事項

高齢者向けサービスでは**050番号**または**市外局番（03/06）**が必須です。
米国番号での運用は避けてください。