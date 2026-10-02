# MMA301 — LMS Classroom

Ứng dụng quản lý lớp học cho hai vai trò **Teacher** và **Student**: xác thực, lớp học, bảng tin, tài liệu, bài tập, nộp bài và chấm điểm. Repository gồm hai Node/Express API, ứng dụng Expo/React Native và bộ QA chạy lại được bằng một lệnh.

## Trạng thái phát hành

| Môi trường | Auth | Core | Trạng thái |
| --- | --- | --- | --- |
| Local | `http://127.0.0.1:4001` | `http://127.0.0.1:4002` | Docker Compose hỗ trợ đầy đủ |
| Staging | [Auth](https://mma301-lms-auth-staging.onrender.com/health) | [Core](https://mma301-lms-core-staging.onrender.com/health) | Health/Docs/OpenAPI và Selenium đã xác minh |
| Production | Chưa tạo | Chưa tạo | Chưa được phép ghi `Done` hoặc `Runtime verified` |

> Render free có thể sleep. Lần gọi đầu tiên có thể mất khoảng một phút. Không lưu password, JWT hoặc Mongo URI trong GitHub, Notion hay ảnh chụp.

## Kiến trúc

```text
Expo / React Native
    ├── Auth Service :4001 ── MongoDB lms_auth
    └── Core API     :4002 ── MongoDB lms_core
             ├── Class / Membership
             ├── Post / Comment / Reaction
             ├── Material
             └── Exercise / Submission / Grade
```

| Thành phần | Công nghệ |
| --- | --- |
| Mobile | Expo SDK 57, React Native 0.86, React Native Paper, TanStack Query |
| Backend | Node.js 22, Express, TypeScript, Mongoose, Zod, JWT |
| Database | MongoDB 7 local; MongoDB Atlas khi deploy |
| API docs | OpenAPI 3 + Scalar |
| QA | Node tests, API scripts, Newman, Playwright, Selenium WebDriver, Maestro, Autocannon |
| CI/CD | GitHub Actions + Render Docker services |

## Cấu trúc repository

```text
apps/mobile/                 Expo application và test mobile
services/auth-service/       Register, login, JWT, health, Scalar/OpenAPI
services/core-api/           LMS domain API, guards, docs và integration scripts
qa/newman/                   API regression collection sinh bằng code
qa/scalar/                   Playwright browser checks
qa/selenium/                 Selenium WebDriver browser checks + screenshots
qa/maestro/                  Android smoke flow
qa/deployment/               Post-deploy smoke
docs/testing/                Automation matrix và manual acceptance cases
docs/deployment/             Render/Atlas runbook
render.yaml                  Blueprint cho Auth/Core Docker service
docker-compose.yml           Mongo + Auth + Core local
```

## Yêu cầu máy

- Node.js 22 và npm.
- Docker Desktop để chạy backend local trọn bộ.
- Android Studio + emulator nếu chạy mobile Android.
- Chrome để chạy Selenium; Playwright dùng Chromium riêng.
- Maestro CLI chỉ cần cho Android E2E.

## Chạy local từ máy mới

### 1. Cài dependencies

```powershell
git clone https://github.com/xukki241/MMA301-LMS-Classroom.git
cd MMA301-LMS-Classroom
Copy-Item .env.example .env
npm ci
npm ci --prefix services/auth-service
npm ci --prefix services/core-api
npm ci --prefix apps/mobile
```

### 2. Chạy Mongo, Auth và Core

```powershell
docker compose up -d --build --wait
docker compose ps
```

Kết quả mong đợi: `mongo`, `auth-service` và `core-api` đều `healthy`.

```powershell
npm run seed
```

Chỉ dùng tài khoản seed ghi trong `.env.example` ở local. Không tạo các tài khoản mặc định này trên public staging/production.

### 3. Kiểm tra API

- Auth health: <http://127.0.0.1:4001/health>
- Auth docs: <http://127.0.0.1:4001/docs>
- Core health: <http://127.0.0.1:4002/health>
- Core docs: <http://127.0.0.1:4002/docs>

### 4. Chạy Android

Android emulator truy cập máy host bằng `10.0.2.2`:

```powershell
$env:EXPO_PUBLIC_AUTH_URL = "http://10.0.2.2:4001"
$env:EXPO_PUBLIC_CORE_URL = "http://10.0.2.2:4002"
npm run android --prefix apps/mobile
```

Với điện thoại thật, thay `10.0.2.2` bằng IPv4 LAN của máy phát triển và cho phép firewall ở cổng `4001`, `4002`.

## Biến môi trường

| Key | Dùng ở đâu | Quy tắc |
| --- | --- | --- |
| `JWT_SECRET` | Auth + Core | Cùng giá trị trong một môi trường; khác giữa staging/production; tối thiểu 32 ký tự |
| `MONGO_URI` | Từng Render service | Auth trỏ `lms_auth*`, Core trỏ `lms_core*`; không commit |
| `CORS_ORIGIN` | Auth + Core | Production dùng origin chính xác, không dùng `*` |
| `TRUST_PROXY` | Render | `true` trên Render, `false` local |
| `EXPO_PUBLIC_AUTH_URL` | Mobile build | URL Auth của đúng môi trường |
| `EXPO_PUBLIC_CORE_URL` | Mobile build | URL Core của đúng môi trường |
| `AUTH_URL`, `CORE_URL` | QA scripts | Base URL của môi trường cần test |
| `SMOKE_*` | Post-deploy smoke | Tài khoản QA tạm; chỉ truyền qua shell/secret store |

Mẫu đầy đủ nằm trong [.env.example](./.env.example). Không commit `.env`, token, Atlas URI hoặc ảnh hiển thị secret.

## Kiểm thử

```powershell
npm run release:gate
```

Quality gate gồm typecheck, OpenAPI, mobile tests, Playwright, Selenium, API scripts, Newman, performance và Maestro. Các phần phụ thuộc runtime phải có backend/emulator đang chạy.

| Lệnh | Phạm vi | Evidence |
| --- | --- | --- |
| `npm run typecheck` | Auth, Core, Mobile | Console/CI |
| `npm run test:mobile` | Mobile API/query/UI behavior | Node test output |
| `npm run test:api` | LMS-05/06/08/09/14 | Console/CI |
| `npm run test:newman` | Auth/Class/Stream regression | `test-reports/newman.xml` |
| `npm run test:scalar` | Scalar/OpenAPI bằng Playwright | trace/screenshot khi lỗi |
| `npm run test:selenium` | Auth/Core docs, health, OpenAPI bằng Chrome WebDriver | screenshots + JSON report |
| `npm run test:performance` | Core health latency/error rate | Console/CI |
| `npm run test:e2e` | Android auth smoke bằng Maestro | Maestro output |
| `npm run test:staging` | Health/docs/dev-token lock/login | Cần QA accounts hợp lệ |

Selenium staging:

```powershell
$env:AUTH_URL = "https://mma301-lms-auth-staging.onrender.com"
$env:CORE_URL = "https://mma301-lms-core-staging.onrender.com"
npm run test:selenium
```

Staging smoke với tài khoản tạm tự sinh (không in password/token):

```powershell
$env:AUTH_URL = "https://mma301-lms-auth-staging.onrender.com"
$env:CORE_URL = "https://mma301-lms-core-staging.onrender.com"
$env:SMOKE_REGISTER_TEMP = "1"
npm run test:staging
```

Manual test có input, expected result và form ghi evidence:

- [docs/testing/manual-test-cases.md](./docs/testing/manual-test-cases.md)
- [apps/mobile/LMS-23-MANUAL-TEST.md](./apps/mobile/LMS-23-MANUAL-TEST.md)
- [docs/testing/automation-matrix.md](./docs/testing/automation-matrix.md)

## Deploy Render + Atlas

`render.yaml` khai báo hai Docker service. Mỗi môi trường cần database Atlas riêng:

```text
staging:    lms_auth_staging / lms_core_staging
production: lms_auth_prod    / lms_core_prod
```

1. Tạo database user tối thiểu quyền cần thiết và allow Render network access.
2. Tạo Auth và Core từ `main`, region Singapore.
3. Nhập `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`; không chụp khi secret đang hiện.
4. Chờ deploy thành công và kiểm tra cả hai `/health`.
5. Chạy Selenium, post-deploy smoke và hành trình Teacher/Student.
6. Nếu smoke thất bại, rollback và không nâng Notion lên `Runtime verified`.

Chi tiết: [docs/deployment/runbook.md](./docs/deployment/runbook.md).

## Quy tắc evidence

```text
Missing → Code verified → PR verified → Runtime verified
```

- Chỉ `Runtime verified` khi có lệnh chạy/device/runtime và evidence.
- `Done` cần reviewer xác nhận Definition of Done.
- Screenshot phải che token, email thật, password và connection string.
- Failure đầu tiên phải được giữ lại; retry không được dùng để giấu lỗi.

## Xử lý lỗi thường gặp

### `RNCNetInfo is null` hoặc `AsyncStorage is null`

```powershell
cd apps/mobile
npx expo install --check
npx expo prebuild --clean --platform android
npm run android
```

### Render health pass nhưng smoke login trả `401`

Health chỉ chứng minh process và database đang sống. Provision hai tài khoản QA tạm hoặc truyền `SMOKE_*` qua local shell; không lưu credential vào repo/Notion.

### Mongo không kết nối

Kiểm tra URI đã URL-encode password, đúng database Auth/Core, Atlas Network Access và user role. Không gửi full URI vào chat hoặc issue.

## Tài liệu chính

- [CONTEXT.md](./CONTEXT.md) — thuật ngữ miền.
- [docs/00-muc-luc-bao-cao.md](./docs/00-muc-luc-bao-cao.md) — mục lục báo cáo.
- [docs/06-huong-dan-phat-trien.md](./docs/06-huong-dan-phat-trien.md) — hướng dẫn phát triển.
- [docs/adr/](./docs/adr/) — quyết định kiến trúc.
- [postman/README.md](./postman/README.md) — Postman/API QA.
- [LMS Classroom trên Notion](https://app.notion.com/p/3751a3267e3e8086b82ecc06d6f23e3a) — board, evidence và runbook.

## Nhóm

Nguyễn Xuân Kiên · Nguyễn Anh Tú · Nguyễn Quốc Hưng · Nguyễn Quang Lộc · Ngô Quang Huy
