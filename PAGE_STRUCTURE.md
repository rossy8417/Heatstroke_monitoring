# ページ構造と遷移図

## 現状のページ構造

### 1. 認証系ページ
```
/login (ログイン)
  ├→ /register (新規登録)
  │   └→ /auth/verify-email (メール確認)
  └→ / (ダッシュボード) ※ログイン成功後
```

### 2. メインアプリケーション

#### 2.1 共通ダッシュボード（現状）
```
/ (ダッシュボード)
  ├→ /alerts (アラート管理)
  │   └→ /alerts/[id] (アラート詳細) ※未実装
  ├→ /households (世帯管理)
  │   └→ /households/[id] (世帯詳細) ※未実装
  └→ /reports (レポート)
```

#### 2.2 ユーザータイプ別ダッシュボード

##### Personal（個人）
```
/personal/dashboard
  ├→ /personal/profile (プロフィール編集) ※未実装
  ├→ /personal/emergency-contacts (緊急連絡先) ※未実装
  └→ /account/subscription (サブスクリプション管理)
```

##### Family（家族）
```
/family/dashboard ※未実装
  ├→ /family/members (家族メンバー管理) ※未実装
  ├→ /family/alerts (家族のアラート) ※未実装
  └→ /account/subscription
```

##### Community（地域コミュニティ）
```
/community/dashboard ※未実装
  ├→ /alerts (アラート管理)
  ├→ /households (世帯管理)
  ├→ /reports (レポート)
  └→ /account/subscription
```

##### Business（企業・団体）
```
/business/dashboard ※未実装
  ├→ /alerts (アラート管理)
  ├→ /households (世帯管理)
  ├→ /reports (レポート)
  ├→ /business/users (ユーザー管理) ※未実装
  └→ /account/subscription
```

### 3. 料金プラン系
```
/pricing (料金プラン選択)
  ├→ /pricing/business (ビジネスプラン詳細)
  └→ Stripe Checkout → /subscription/success
```

### 4. アカウント設定系
```
/account/subscription (サブスクリプション管理)
  └→ Stripe Customer Portal (外部)
```

## 実装状況

### ✅ 実装済み
- ログイン・登録フロー
- 共通ダッシュボード
- アラート管理
- 世帯管理  
- レポート
- 料金プラン選択
- サブスクリプション管理

### ⚠️ 部分実装
- /personal/dashboard - ナビゲーションなし

### ❌ 未実装
- ユーザータイプ別ルーティング
- Family向けダッシュボード
- Community向けダッシュボード
- Business向けダッシュボード
- プロフィール編集
- 緊急連絡先管理
- 家族メンバー管理
- ユーザー管理（Business向け）
- アラート・世帯詳細ページ

## 必要な作業

### 優先度：高
1. ユーザータイプに応じたダッシュボードへのリダイレクト
2. Personal dashboardのナビゲーション追加
3. アカウント設定ページの作成

### 優先度：中
1. Family向けダッシュボード実装
2. Community/Business向けダッシュボード実装
3. プロフィール編集機能

### 優先度：低
1. 詳細ページの実装
2. 管理者向け機能

## ユーザータイプ別の機能マトリックス

| 機能 | Personal | Family | Community | Business |
|------|----------|---------|-----------|----------|
| 自分の情報管理 | ✓ | ✓ | ✓ | ✓ |
| 家族の見守り | - | ✓ | - | - |
| 複数世帯管理 | - | - | ✓ | ✓ |
| アラート管理 | 自分のみ | 家族のみ | 全世帯 | 全世帯 |
| レポート | - | 簡易 | ✓ | ✓ |
| ユーザー管理 | - | - | - | ✓ |
| 料金 | 無料/有料 | 有料 | 有料 | 有料 |