# Heatstroke_monitoring

## Documents
- 要件定義書: `docs/requirements.md`
- システム仕様書: `docs/system-spec.md`
- タスク分解書（WBS）: `docs/wbs.md`
- UI/UX設計書: `docs/ui-ux.md`

## Local development
### API (stubs)
- Location: `api`
- Prereqs: Node.js 18+
- Setup:
  ```bash
  cd api
  npm install
  cp .env.example .env  # 値を設定
  npm run dev
  ```
- Endpoints:
  - GET `/_stub/state`
  - GET `/stub/weather?grid=5339-24-XXXX`
  - POST `/stub/call` { alert_id?, force_dtmf? }
  - POST `/stub/line` { ... } / `POST /stub/line/push` with template
  - POST `/stub/sms` { to, reason }
  - POST `/webhooks/voice|sms|line` (optional HMAC via `WEBHOOK_SECRET`; LINE署名検証は`LINE_CHANNEL_SECRET`)
  - POST `/stub/line/postback` { action: 'take_care' | 'done', alert_id }
  - GET `/stub/alerts/today` (summary含む)

### Jobs (alert judgment)
- Location: `jobs`
- Run self test:
  ```bash
  cd jobs
  npm install
  npm run selftest
  ```

### Web (admin UI)
- Location: `web`
- Run dev:
  ```bash
  cd web
  npm install
  npm run dev
  # open http://localhost:3001
  ```

### CI
- GitHub Actions: `/.github/workflows/ci.yml`
  - Runs `api` and `jobs` self-tests on push/PR to `main`

### Mono-repo structure
- `api`: Stub API server (Express)
- `web`: Admin UI (Next.js placeholder)
- `jobs`: Schedulers/Workers placeholders
- `infra`: IaC placeholders
