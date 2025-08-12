# Twilio日本番号取得のためのRegulatory Compliance手順

## なぜ必要か
日本の電話番号を取得するには、日本の電気通信事業法に基づく本人確認が必要です。

## 手順

### 1. Regulatory Bundleの作成

1. **Twilioコンソール** → **Phone Numbers** → **Regulatory Compliance**
   https://console.twilio.com/develop/phone-numbers/regulatory-compliance/bundles

2. **「Create a Bundle」** をクリック

3. **Bundle Type**: `Individual` または `Business` を選択
   - Individual: 個人利用
   - Business: 法人利用

4. **Country**: `Japan` を選択

### 2. 必要書類のアップロード

#### 個人（Individual）の場合：
- **身分証明書**（以下のいずれか）:
  - パスポート
  - 運転免許証
  - マイナンバーカード（表面のみ）
  
- **住所証明書**（3ヶ月以内、以下のいずれか）:
  - 公共料金請求書（電気・ガス・水道）
  - 銀行取引明細書
  - 住民票

#### 法人（Business）の場合：
- **法人登記簿謄本**（3ヶ月以内）
- **代表者の身分証明書**
- **事業所の住所証明**

### 3. 情報入力

必須項目を入力：
- **Full Name**: 氏名（ローマ字）
- **Address**: 住所（英語表記）
  - 例: 1-2-3 Shibuya, Shibuya-ku, Tokyo 150-0002
- **Phone Number**: 連絡先電話番号
- **Email**: メールアドレス

### 4. 利用目的の説明

**Use Case Description** に以下のような説明を記入：
```
This phone number will be used for a heatstroke prevention system for elderly people. 
The system makes automated calls to check on elderly residents during hot weather 
and alerts family members if assistance is needed.
```

日本語での説明も追加：
```
熱中症予防見守りシステムで使用します。
高齢者の安否確認のための自動音声通話を行い、
必要に応じて家族に通知します。
```

### 5. 提出と審査

1. **「Submit Bundle」** をクリック
2. 審査状況: **Pending Review** → **Approved**
3. 審査期間: 通常1-3営業日

### 6. 承認後の番号購入

1. Bundle承認メールが届く
2. **Phone Numbers → Buy a number** で日本番号が購入可能に
3. 番号を選んで購入

## トラブルシューティング

### 書類が拒否された場合
- **書類の画質**: 鮮明な画像をアップロード
- **有効期限**: 3ヶ月以内の書類を使用
- **名前の一致**: すべての書類で名前が一致していること

### 審査が遅い場合
- Support Ticketを作成
- https://console.twilio.com/support/tickets

### 代替案

すぐに番号が必要な場合：
1. **Twilio Flex Trial**: 30日間無料で日本番号付き
2. **他社サービス**: IVRy、Vonageなど

## サポート連絡先

- **Twilioサポート**: https://support.twilio.com/
- **日本語サポート**: 平日9:00-18:00
- **メール**: support@twilio.com