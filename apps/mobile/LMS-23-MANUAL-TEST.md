# Bàn giao test thủ công (mobile + LMS-23)

Dùng tài liệu này để clone repo và chạy tay trên Pixel_10. Không commit `.env`, password, JWT, Mongo URI, email QA hay mã lớp. Screenshot không chứa secret (`test-results/` đã gitignore).

Chi tiết API/acceptance: [docs/testing/manual-test-cases.md](../../docs/testing/manual-test-cases.md). Gate tự động: [docs/testing/automation-matrix.md](../../docs/testing/automation-matrix.md).

## 1. Clone và cài

```powershell
git clone https://github.com/xukki241/MMA301-LMS-Classroom.git
cd MMA301-LMS-Classroom
Copy-Item .env.example .env
npm ci
npm ci --prefix services/auth-service
npm ci --prefix services/core-api
npm ci --prefix apps/mobile
```

## 2. Auth / Core local

```powershell
docker compose up -d --build --wait
npm run seed
```

Health/docs: <http://127.0.0.1:4001/health> · <http://127.0.0.1:4001/docs> · <http://127.0.0.1:4002/health> · <http://127.0.0.1:4002/docs>

- Token 1-click `/docs/tokens/teacher|student` **chỉ** khi `NODE_ENV` không phải `production` (mặc định Compose).
- Để **khóa** token giống staging: chạy Auth/Core với `$env:NODE_ENV = "production"` — `POST /docs/tokens/*` phải `403`.
- Scalar **local** hoạt động sau khi inline OpenAPI `$ref`. Scalar **staging** vẫn bản cũ cho đến khi redeploy Auth/Core. **Production** đang chặn vì secret đã xoay — không ghi secret vào git.

## 3. Staging (không redeploy từ máy tester)

| Dịch vụ | URL |
| --- | --- |
| Auth | `https://mma301-lms-auth-staging.onrender.com` |
| Core | `https://mma301-lms-core-staging.onrender.com` |

Smoke API (tài khoản tạm, không in password):

```powershell
$env:AUTH_URL = "https://mma301-lms-auth-staging.onrender.com"
$env:CORE_URL = "https://mma301-lms-core-staging.onrender.com"
$env:SMOKE_REGISTER_TEMP = "1"
npm run test:staging
```

## 4. Expo Android trên Pixel_10

Chọn AVD **theo tên** `Pixel_10`, không dùng serial `adb`. Từ `apps/mobile`:

```powershell
$env:EXPO_PUBLIC_AUTH_URL = "https://mma301-lms-auth-staging.onrender.com"
$env:EXPO_PUBLIC_CORE_URL = "https://mma301-lms-core-staging.onrender.com"
cd apps/mobile
npx expo run:android -d Pixel_10
```

Local emulator (host `10.0.2.2`):

```powershell
$env:EXPO_PUBLIC_AUTH_URL = "http://10.0.2.2:4001"
$env:EXPO_PUBLIC_CORE_URL = "http://10.0.2.2:4002"
cd apps/mobile
npx expo run:android -d Pixel_10
```

Login testID: `login-email`, `login-password`, `login-submit`. Seed local: `teacher@lms.local` / `student@lms.local` (chỉ local). Staging: đăng ký tài khoản tạm, không dùng seed production.

## 5. Bài tập → nộp một lần → cập nhật cùng dòng → chấm 8.5

1. Giáo viên tạo lớp, học sinh join (giữ mã lớp **ngoài git**).
2. Giáo viên tạo bài tập hạn tương lai; học sinh mở bài (`testID` nộp: `submit-exercise`).
3. Nộp lần đầu → thành công. Nộp lần hai cùng bài → lỗi trùng (409); **cập nhật cùng một submission** thì được.
4. Sau hạn: giáo viên chấm `score: 8.5` + feedback; học sinh thấy điểm trên bài của mình.

## 6. Offline — cô lập user thứ hai

Xem checklist LMS-23 bên dưới. Bắt buộc: user A cache lớp online → đăng xuất → user B đăng nhập → airplane → **không** thấy lớp của A.

## 7. Quality gate (không bắt Maestro)

```powershell
npm run typecheck
npm run verify:docs
npm run validate:docs
npm run test:mobile
npm run test:contract
npm run test:scalar
npm run test:api
```

Newman / performance có thể chạy thêm khi backend sống. **Không** cần `npm run test:e2e` / Maestro để bàn giao tay.

Maestro **tuỳ chọn** nếu có `MAESTRO_EMAIL` / `MAESTRO_PASSWORD` trong shell (không commit): `npm run test:e2e`. Một máy dev có CLI tại `C:\Users\Admin\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\maestro-cli\maestro\bin\maestro.bat` — máy khác **không** giả định path này.

---

# LMS-23 manual runtime checklist

Use an Android emulator or device with the mobile app, Auth Service, and Core API running. Test with both a teacher and student account. Record device, build, API environment, date, and each observed result. Automated tests use stubbed HTTP/storage; airplane mode remains a device check.

## Copy-ready staging run

Use only temporary staging accounts and a staging database. Never paste a real password or production token into this document.

| Key | Value to enter | Expected result |
| --- | --- | --- |
| `EXPO_PUBLIC_AUTH_URL` | `https://mma301-lms-auth-staging.onrender.com` | Login/register requests go to staging Auth |
| `EXPO_PUBLIC_CORE_URL` | `https://mma301-lms-core-staging.onrender.com` | Class/Stream requests go to staging Core |
| Teacher email | `qa.teacher.<timestamp>@example.test` | Teacher account can create a class |
| Teacher display name | `QA Teacher` | Home screen greets `QA` or the configured display name |
| Student email | `qa.student.<timestamp>@example.test` | Student account can join by class code |
| Password | A temporary staging password of at least 8 characters | Register/login returns success; keep it local |
| Class name | `QA Offline <timestamp>` | Teacher sees the class and its returned code |
| Offline post draft | `Offline should be rejected` | No post is created; error is `Không có kết nối mạng. Vui lòng kết nối Internet và thử lại.` |

PowerShell setup from the repository root:

```powershell
$env:EXPO_PUBLIC_AUTH_URL = "https://mma301-lms-auth-staging.onrender.com"
$env:EXPO_PUBLIC_CORE_URL = "https://mma301-lms-core-staging.onrender.com"
cd apps/mobile
npm run typecheck
npm test
npx expo run:android -d Pixel_10
```

On the Android emulator, run the flow in this order:

1. Sign in with the temporary teacher account and create/open one class.
2. Confirm the class name and class code are visible; open **Bảng tin** once so its data is cached.
3. Turn on airplane mode, or disable Wi‑Fi/data on the device if the emulator does not emit a network event.
4. Relaunch the app. Expected: the offline banner is visible and the cached class remains visible.
5. Open the cached class and **Bảng tin**. Expected: previously loaded data remains available.
6. Enter `Offline should be rejected` and tap **Đăng bài**. Expected: the post is not created and the exact offline error appears.
7. Restore network. Expected: the banner disappears after refresh; normal server results load again.

Record the result in the table below. A screenshot is required for the offline banner and the rejected write; automated unit tests alone do not count as device evidence.

## A. Class cache

- [ ] Sign in online, open Home and Class list, and confirm fetched classes appear.
- [ ] Enable airplane mode, return to Class list, pull to refresh, and relaunch the app while still offline.
- [ ] Confirm the same classes remain visible, the offline banner appears, and the app does not crash.
- [ ] Open a previously loaded class; confirm class detail and Stream navigation remain available. Member data may require network.
- [ ] Sign in as a second user after reconnecting, go offline, and confirm the first user's classes do not appear.
- [ ] After **Đăng xuất**, confirm AsyncStorage keys prefixed with `lms23:` are cleared (logout purges offline cache; in-memory React Query is also cleared).
- [ ] On a fresh account without saved classes, go offline and confirm a clear no-cache error appears.

## B. Stream cache

- [ ] Online, open a class Stream and confirm posts load.
- [ ] Enable airplane mode, reopen/refresh Stream, then relaunch and reopen it.
- [ ] Confirm the previously fetched posts remain visible under the correct class and the banner appears.
- [ ] Open a different class that was never fetched and confirm its feed does not show posts from the first class.
- [ ] A separate comment request may show a network error; LMS-23 persists the post feed, not comment threads.

## C. Offline writes

- [ ] While offline, try Create Class, Join Class, Create Post, and Create Comment using valid input and an already loaded comment thread.
- [ ] Each action shows “Không có kết nối mạng. Vui lòng kết nối Internet và thử lại.”
- [ ] Confirm no success message, navigation to a new item, fabricated row, or pending action appears.
- [ ] Reconnect without repeating those actions; confirm they are not replayed automatically.

## D. Reconnect and regression

- [ ] Restore network; confirm the offline banner disappears.
- [ ] Refresh Class list and Stream; confirm current server results load.
- [ ] Teacher: create a class, open detail, inspect class code, create a post and comment.
- [ ] Student: join by code, open detail, view posts, comment, and confirm no Post composer is offered when membership does not permit it.
- [ ] Verify loading, empty, error/retry, and duplicate-submit handling remain functional.

## Automated checks for review

Run `npm run typecheck` and `npm test` in `apps/mobile`. Run `npx expo export --platform web` when checking bundling. Runtime airplane-mode results must be recorded separately from automated tests.
