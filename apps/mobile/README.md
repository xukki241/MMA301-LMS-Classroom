# Mobile (Expo)

Expo Go. Stack: `(auth)` → `(teacher)` | `(student)`.

```bash
# apps/mobile/.env
EXPO_PUBLIC_AUTH_URL=http://10.0.2.2:4001
EXPO_PUBLIC_CORE_URL=http://10.0.2.2:4002
```

Máy thật: đổi sang IP LAN của máy chạy Auth/Core.

```bash
npx expo start
```

Seed: `teacher@lms.local` / `student@lms.local` — `Demo123!`.

APK sau này: `eas build -p android --profile preview` (không cần Firebase).
