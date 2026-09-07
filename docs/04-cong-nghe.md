# Chương 4. Công nghệ và quyết định kỹ thuật

## 4.1. Stack công nghệ

| Lớp | Công nghệ | Lý do chọn |
|-----|-----------|------------|
| Mobile | React Native + Expo (Expo Go) | Đúng bắt buộc môn; APK sau này bằng EAS, chưa cần Dev Client |
| Ngôn ngữ | TypeScript | Backend Express + RN cùng ngôn ngữ, dễ contract |
| Backend | Node.js + Express (TypeScript) | Auth Service + Core API, REST JSON |
| Auth | JWT tự phát hành (bcrypt) | Firebase Auth **không** dùng ở MVP |
| API nghiệp vụ | Core API (Express) | Một process cho toàn bộ domain LMS |
| CSDL MVP | MongoDB 7 (Docker) | Hai database: `lms_auth`, `lms_core` |
| Firebase | Placeholder rules | Firestore/Crashlytics/App Distribution **sau** MVP; không phải DB chính |
| Tài liệu API | Swagger/OpenAPI (khuyến nghị) | Đồng bộ contract mobile–backend |

## 4.2. Cấu trúc thư mục repository

```text
lms-classroom-app/
├── apps/mobile/           # Expo React Native (Expo Go)
├── services/
│   ├── auth-service/      # JWT TypeScript
│   └── core-api/          # Nghiệp vụ LMS TypeScript
├── infra/mongo/           # Init + mô tả index
├── firebase/              # Rules placeholder, chưa bật MVP
├── docker-compose.yml
├── docs/                  # Báo cáo + tracking Kiên
├── CONTEXT.md
├── SCOPE.md
└── README.md
```

## 4.3. Nhật ký quyết định kiến trúc (ADR)

| Mã | Quyết định | Tóm tắt |
|----|------------|---------|
| ADR-0001 | Greenfield + Auth sidecar | Không salvage monorepo microservices cũ; chỉ Auth tách riêng khỏi Core API |
| ADR-0002 | Docs/repo độc lập với 30Shine | Hai đề tài song song, tài liệu và GitHub tách biệt |
| ADR-0003 | JWT + Mongo; Firebase sau | Identity nhà làm; Firestore không phải source of truth MVP |
| ADR-0004 | Một Mongo, hai DB | Auth/Core không share collection User |

Chi tiết: thư mục `docs/adr/`.

## 4.4. Lý do loại bỏ kiến trúc cũ

Bản thiết kế trước đây gồm nhiều service (worker, notification, gRPC, Redis, LocalStack, admin analytics…). Kiến trúc đó:

- vượt yêu cầu và thời lượng môn học;
- khó phân công đều cho 5 người mới;
- lệch tiêu chí chấm điểm vốn tập trung vào **app RN + REST + DB + luồng nghiệp vụ rõ**.

Do đó nhóm **xây lại từ đầu** với phạm vi Shub-lite.

## 4.5. Bảo mật tối thiểu

- Hash mật khẩu (bcrypt hoặc tương đương).  
- JWT có thời hạn; mobile gửi `Authorization: Bearer <token>`.  
- Kiểm tra membership trước mọi thao tác trên Class.  
- Không commit file `.env` / secret.  
