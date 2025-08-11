## 熱見守りボット（電話×LINE）システム仕様書 v1.0
- 作成日：2025-08-11（JST）
- 対象範囲：MVP～正式版で共通となる技術仕様（要件定義書 v1.0 準拠）
- 想定導入形態：①自治会/包括支援センター向けマルチ世帯運用、②家族直契約の小規模運用

---

### 1. 全体アーキテクチャ
#### 1.1 構成概要
- フロント：管理画面（Next.js）、家族・近隣向けLINE Bot
- ジョブ/判定：暑さ指標ポーリング、警戒ルール判定、発呼ジョブ生成（Cloud Run / Functions）
- コミュニケーション：音声IVR（発呼・DTMF取得）、SMS送信、LINE Messaging API
- ストレージ/DB：主DB（Firestore/Supabase いずれか）、WORM監査ログ（オブジェクトストレージ）
- 監視/運用：外形監視、ログ集約、アラート（Slack/PagerDuty）

#### 1.2 データフロー（要約）
1. 判定ジョブが地域メッシュごとに暑さ指標APIを取得 → 警戒ON判定
2. 発呼スケジューラが対象世帯へコール要求 → IVR実施・DTMF収集 → 応答保存
3. 未応答はSMS → 再コール → 家族LINE → 近隣LINEの順でエスカレーション
4. すべての送達はnotificationsに記録、要約は管理画面へ反映

---

### 2. コンポーネント仕様
#### 2.1 管理画面（Web）
- 技術：Next.js + TypeScript、認証（OIDC/Passwordless）、RBAC（R1/R2/R3）
- 主要画面：
  - 当日アラート一覧（未応答“赤”、フィルタ：テナント/町丁/リスク）
  - 世帯台帳（登録/編集/同意確認/連絡順序）
  - 通話ログ詳細（日付/結果/秒数/DTMF/録音再生※任意）
  - レポート出力（CSV：応答率、エスカ時間、件数）
- 非機能：初期表示≤1.5s（TTFB）、主要操作≤300ms（P95）

#### 2.2 判定ジョブ
- 周期：1時間毎（季節は30分まで短縮可、設定化）
- 入力：address_grid（町丁目→メッシュID）
- 出力：alerts（date, level=注意/警戒/厳重警戒, first_trigger_at）
- リトライ：指数バックオフ（3回、最大90秒）

#### 2.3 発呼キュー/IVR
- 同時発呼：レート制御（例：1,000 calls/min テナント合算）
- IVRプロンプト：録音 or TTS（ゆっくり/再読可）、DTMF 1/2/3
- 失敗時：busy/noanswer/failed をcall_logsに保存、未応答フローへ

#### 2.4 メッセージング
- SMS：未応答1回目、LINE不通時の予備
- LINE Bot：家族/近隣へPush、クイックリプライ（「対応する」「電話する」「近隣要請」）

#### 2.5 監査・可観測性
- audit_logs：重要操作（登録/通知/削除）をWORM的に格納（改ざん検知ハッシュ）
- メトリクス：コール接続率、DTMF成功率、エスカ到達時間、API失敗率
- 外形監視：毎朝のテスト番号への発信、LINE到達テスト

---

### 3. データモデル（ERD 概念）
- tenants … テナント（自治会/家族）
- households (tenant_id, name, phone, address_grid, notes, consent_at, risk_flag)
- contacts (household_id, type: family/neighbor/staff, priority, line_user_id, phone)
- alerts (household_id, date, level, status: open/ok/escalated, first_trigger_at, closed_at)
- call_logs (alert_id, started_at, duration_sec, result: ok/noanswer/busy/help, dtmf, recording_url?)
- notifications (alert_id, channel: phone/sms/line, to, template_id, status, delivered_at)
- audit_logs (actor, role, action, target_type, target_id, ts, hash_chain)

- 保持ポリシー
  - PIIの本体は90日でマスキング（電話末尾4桁のみ等）
  - 集計指標は匿名化IDで12ヶ月保持
  - 退会後は30日で完全削除（監査法令分除く）

---

### 4. ルールエンジン仕様
#### 4.1 警戒発火
- 入力：WBGT(level), 気温, 湿度, 地域メッシュ
- 規則（初期）：
  - 発火：level >= 警戒 になった時点で当日有効
  - 通知枠：09:00, 13:00, 17:00（最初の有効応答で当日終了）
  - 夜間（22–07）は発呼しない（翌朝へ持越）

#### 4.2 エスカレーション
1. コール#1 → noanswer → SMS-1
2. 5分後 コール#2 → noanswer → 家族LINE
3. 家族未対応（10分）→ 近隣LINE（事前同意のみ）
4. 家族/近隣が「対応中」押下で停止

---

### 5. API 仕様（代表）
- ベースURL: `https://api.[domain]/v1`（管理画面＆ジョブから内部利用）
- 認証：管理画面→Bearer（OIDC）、システム間→Signed Webhook（HMAC-SHA256）

#### 5.1 Households
- POST /households
```json
{
  "tenant_id": "t_001",
  "name": "山田花子",
  "phone": "+81XXXXXXXXXX",
  "address_grid": "5339-24-XXXX",
  "risk_flag": true,
  "notes": "独居・心疾患",
  "contacts": [
    {"type":"family","priority":1,"line_user_id":"Uxxxx","phone":"+81..."},
    {"type":"neighbor","priority":2,"line_user_id":"Uyyyy"}
  ]
}
```
- Res 201：`{ "id": "h_123" }`
- GET /households?h=... 検索（tenantスコープ、部分一致）

#### 5.2 Alerts
- POST /alerts/issue（バッチ向け：特定メッシュ/世帯に当日アラート作成）
```json
{"tenant_id":"t_001","household_ids":["h_1","h_2"],"level":"警戒"}
```
- POST /alerts/:id/close（当日終了・理由）

#### 5.3 Manual Ops
- POST /calls/:alert_id/retry（手動再コール）
- POST /notifications/line/push
```json
{"to_line_user_id":"Uxxxx","template_id":"family_unanswered","params":{"name":"山田花子","phone":"+81..."}}
```

#### 5.4 Webhooks（コール/SMS/LINE）
- /webhooks/voice（発呼プロバイダ → 結果）
```json
{"call_id":"c_1","alert_id":"a_1","status":"completed","dtmf":"2","duration_sec":38}
```
- /webhooks/sms（配達レシート）
```json
{"message_id":"m_1","to":"+81...","status":"delivered"}
```
- /webhooks/line（家族の応答）
```json
{"event":"postback","userId":"Uxxx","data":{"action":"take_care","alert_id":"a_1"}}
```
- 検証：全Webhookは `X-Signature: sha256=...` を必須。タイムスキュー±5分。

---

### 6. IVR 音声フロー仕様
- 状態遷移（簡易）
  - Start → ガイダンス再生 → 入力待ち（最大3回/各5秒）
  - 入力1：OK → 保存 → 終了
  - 入力2：しんどい → 保存 → 家族LINE即時 → 終了
  - 入力3：ヘルプ → 保存 → 家族LINE至急 + 管理画面 赤 → 終了
  - 入力なし/無効：再読 or オペレーター案内（MVPは無し）
- 音声仕様
  - 速度：0.9×（高齢者向け）／文節で区切る
  - DTMF：1桁、連続入力は最後を採用

---

### 7. テンプレート（通知）
#### 7.1 SMS（未応答1回目）
【熱の見守り】本日警戒です。折り返しの自動案内にご協力ください。
この番号から再度お電話します。

#### 7.2 LINE（家族・未応答）
- タイトル：【未応答】◯◯さんに2回お電話しました
- ボタン：
  - 「今すぐ電話」：tel:リンク
  - 「対応中」：postback {action: "take_care"}
  - 「近隣へ声かけ依頼」：postback {action: "ask_neighbor"}

---

### 8. 設定・パラメータ
- 通知時刻：09:00 / 13:00 / 17:00（テナントごとに上書き可）
- 夜間停止：22:00–07:00（硬停止ウィンドウ）
- 再コール間隔：5分（noanswer/busy時）
- 家族待機：10分（未対応→近隣通知）
- 保存期間(PII)：90日（自動マスキング）
- 閾値（WBGT）：「警戒」以上（ルールテーブル化）

---

### 9. セキュリティ/プライバシー
- 認証/認可：OIDC、最小権限のRBAC。管理画面はIP制限可。
- 通信/保存：TLS1.2+、RestはAES-256、鍵はKMS管理。
- 監査：audit_logs はハッシュ連鎖で改ざん検知。
- 同意管理：同意文書IDと署名/チェック記録を households.consent_at に紐付け。
- 削除：退会→即停止、30日後完全削除（監査除外）。
- 免責：医療行為ではない旨の明示、緊急時は119をガイダンス。

---

### 10. 障害時フォールバック
- 発呼プロバイダ障害：セカンダリプロバイダにフェイルオーバー（MVPは手動切替でも可）
- 暑さAPI障害：直近2時間のキャッシュで継続判定、ダッシュボードへ黄色警告
- LINE障害：家族にSMS代替リンク送付
- 大規模障害：管理画面に“手動運用手順”（紙名簿・電話連絡網）を掲示

---

### 11. 性能・SLA
- 稼働率：盛夏期 99.5%（コア時間 99.9% 目標）
- レイテンシ：LINE Push ≤10秒（平均）、発呼キュー投入→着信 ≤60秒（平均）
- スループット：1,000 calls/min（テナント合算、拡張可能）

---

### 12. ロギング・メトリクス
- アプリログ：JSON構造化、相関ID（alert_id/call_id）
- ビジネスメトリクス：応答率、しんどい/ヘルプ率、エスカ時間、未応答率、時間帯別
- SLO監視：未応答率>15%（30分）、発呼遅延>60秒、API失敗>2%でAlert

---

### 13. リリース/環境
- 環境：dev / staging / prod（完全分離）
- デプロイ：CI/CD（main→staging→prod、手動承認）
- アプリ可観測性：OpenTelemetry導入、分散トレース
- 秘密管理：Vault/KMS、Rotate 90日

---

### 14. テスト観点（受入のための最小ケース）
- 判定：WBGTモックで「注意→警戒」遷移時に当日フラグON
- IVR：1/2/3 各入力で正しい通知とログ保存
- 未応答：noanswer → SMS → 再コール → LINE（家族） → LINE（近隣）
- 家族操作：「対応中」押下で以降停止、監査に記録
- 運用：管理画面で手動再コール成功、CSVに正しい集計が出力

---

### 15. 開発インタフェース（ダミー/スタブ）
- 暑さAPIスタブ：`/stub/weather?grid=...` → `{ "level": "警戒", "wbgt": 29.2 }`
- 発呼スタブ：`/stub/call` → 完了後 `/webhooks/voice` を擬似POST
- LINEスタブ：`/stub/line` → push結果の模擬

---

### 16. 既知の未決事項（Open Items）
- 暑さ指標の正式ソース/契約（実運用APIの選定）
- 発呼プロバイダの本番回線（国内発信の料金/上限制御）
- 録音保存の可否（個人情報・同意の観点でMVPは録音なし推奨）
- 自治体導入時のオフライン名簿運用ルール（紙→デジタイズ手順）
