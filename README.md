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
  npm run dev
  ```
- Endpoints:
  - GET `/_stub/state`
  - GET `/stub/weather?grid=5339-24-XXXX`
  - POST `/stub/call` { alert_id?, force_dtmf? }
  - POST `/stub/line` { ... }
  - POST `/webhooks/voice|sms|line` (optional HMAC via `WEBHOOK_SECRET`)

### Mono-repo structure
- `api`: Stub API server (Express)
- `web`: Admin UI (Next.js placeholder)
- `jobs`: Schedulers/Workers placeholders
- `infra`: IaC placeholders
