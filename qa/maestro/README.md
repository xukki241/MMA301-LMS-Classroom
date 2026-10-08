# Maestro Android E2E

Optional. Manual testers do not need Maestro. Run against the `Pixel_10` AVD with the mobile app built for staging Auth/Core. A machine-specific CLI path such as the Codex Windows package `maestro.bat` is not part of the repo — other testers must install Maestro themselves.

## Prerequisites

- Emulator running with `com.mma301.lmsclassroom` installed
- App built with staging URLs (do not log secrets):

```powershell
$env:EXPO_PUBLIC_AUTH_URL = "https://mma301-lms-auth-staging.onrender.com"
$env:EXPO_PUBLIC_CORE_URL = "https://mma301-lms-core-staging.onrender.com"
cd apps/mobile
npm run android
```

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

Flows are fail-closed: missing Maestro, emulator, credentials, or backend is a failed gate.
