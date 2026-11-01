# Maestro Android E2E

Optional. Manual testers do not need Maestro. Run against the `Pixel_10` AVD with the mobile app built for staging Auth/Core (or a local Docker/API stack). A machine-specific CLI path such as the Codex Windows package `maestro.bat` is not part of the repo — other testers must install Maestro themselves.

## Prerequisites

- Emulator running with `com.mma301.lmsclassroom` installed
- App built with Auth/Core URLs pointing at the stack under test (do not log secrets):

```powershell
$env:EXPO_PUBLIC_AUTH_URL = "https://mma301-lms-auth-staging.onrender.com"
$env:EXPO_PUBLIC_CORE_URL = "https://mma301-lms-core-staging.onrender.com"
cd apps/mobile
npm run android
```

For the **payment unlock** flow, prefer a **local** stack with `npm run seed:demo` so `student@lms.local` has a locked paid material. Staging accounts usually lack that seed.

- QA credentials in the **local shell only** (team-provisioned staging accounts or accounts you registered manually).
  Local seed `teacher@lms.local` / `Demo123!` often fails on staging with invalid credentials — prefer documented QA emails or `SMOKE_REGISTER_TEMP=1` via `npm run test:staging` for API smoke, not Maestro.

```powershell
$env:MAESTRO_EMAIL = "teacher+qa-YYYYMMDD@example.test"
$env:MAESTRO_PASSWORD = "<local-test-password>"
npm run test:e2e
```

Optional exercise navigation (teacher must already own a class named in `MAESTRO_CLASS_NAME`):

```powershell
$env:MAESTRO_CLASS_NAME = "QA LMS class name"
npm run test:e2e:exercise
```

## Payment unlock (demo default)

Flow file: `qa/maestro/payment-unlock.yaml`.

Default path is **demo-safe**: open class → Tài nguyên → paid locked material → SePay dialog → tap **Tôi đã chuyển khoản** → assert unlock. It never sends real money.

```powershell
# Local seed accounts (shell only — do not commit)
$env:MAESTRO_EMAIL = "student@lms.local"
$env:MAESTRO_PASSWORD = "Demo123!"
# Optional overrides (defaults match seed-demo):
# $env:MAESTRO_CLASS_NAME = "Lập trình di động"
# $env:MAESTRO_PAID_MATERIAL = "Bài giảng Premium · React Native"
npm run test:e2e:payment
```

### Optional LIVE assert (manual)

Set `MAESTRO_PAYMENT=live` only when Core API has `SEPAY_*` configured. The flow **asserts** bank transfer UI (STK / **Mở cổng SePay / Quét QR**) and closes the dialog — it does **not** open the hosted checkout or confirm a real transfer. With LIVE keys, demo confirm is not the primary path.

```powershell
$env:MAESTRO_PAYMENT = "live"
npm run test:e2e:payment
```

If `MAESTRO_PAYMENT` is unset/demo but the API returns LIVE checkout, the YAML still takes the LIVE assert-only branch when the “LIVE:” caption is visible.

Flows are fail-closed: missing Maestro, emulator, credentials, or backend is a failed gate.
