# Supabaseセットアップガイド

## 1. Supabaseアカウント作成

1. **https://supabase.com** にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインイン（推奨）

## 2. プロジェクト作成

1. ダッシュボードで「New Project」をクリック
2. 以下の情報を入力：
   - **Organization**: 自分の組織を選択（または新規作成）
   - **Project name**: `heatstroke-monitoring`
   - **Database Password**: 強力なパスワードを生成して保存
   - **Region**: `Northeast Asia (Tokyo)` を選択
3. 「Create new project」をクリック（数分かかります）

## 3. データベーススキーマの作成

1. プロジェクトが作成されたら、左メニューから「SQL Editor」を選択
2. 「New Query」をクリック
3. `api/src/db/schema.sql` の内容をコピー＆ペースト
4. 「Run」をクリックしてスキーマを作成

## 4. API認証情報の取得

1. 左メニューから「Settings」→「API」を選択
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGci...` (公開キー)
   - **service_role**: `eyJhbGci...` (サービスキー、秘密にする)

## 5. 環境変数の設定

1. `api/.env` ファイルを作成（`.env.example` をコピー）
2. 以下の値を設定：

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci... (anon publicキー)
SUPABASE_SERVICE_KEY=eyJhbGci... (service_roleキー)
```

## 6. 接続テスト

```bash
cd api
npm start

# 別のターミナルで
curl http://localhost:3000/_stub/state
```

レスポンスに `"ok": true` が含まれていれば成功です。

## 7. Row Level Security (RLS) の設定

本番環境では、以下のRLSポリシーを設定してください：

### households テーブル
```sql
-- テナントごとのアクセス制限
CREATE POLICY "Tenants can view own households" 
ON households FOR SELECT 
USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can insert own households" 
ON households FOR INSERT 
WITH CHECK (tenant_id = auth.uid());
```

### alerts テーブル
```sql
-- 世帯に紐づくアラートのみ表示
CREATE POLICY "View alerts for own households" 
ON alerts FOR SELECT 
USING (
  household_id IN (
    SELECT id FROM households 
    WHERE tenant_id = auth.uid()
  )
);
```

## 8. バックアップとリストア

### バックアップ
```bash
# Supabaseダッシュボードから
Settings → Backups → Download backup
```

### リストア
```bash
# SQLエディタから
pg_restore を使用
```

## トラブルシューティング

### 接続エラー
- API URLが正しいか確認
- APIキーが正しいか確認
- ネットワーク接続を確認

### スキーマエラー
- SQLエディタでエラーメッセージを確認
- 既存のテーブルがある場合は削除してから再実行

### 認証エラー
- service_roleキーを使用しているか確認
- RLSが有効な場合は、適切なポリシーが設定されているか確認

## 無料枠の制限

Supabase無料プランの制限：
- **データベース**: 500MB
- **ストレージ**: 1GB
- **帯域幅**: 2GB/月
- **Edge Functions実行**: 500,000回/月
- **同時接続数**: 50

本番環境では有料プラン（$25/月〜）への移行を検討してください。