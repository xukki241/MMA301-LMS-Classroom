# Chương 4. Công nghệ và quyết định kỹ thuật

## 4.1. Stack công nghệ

| Lớp | Công nghệ | Lý do chọn |
|-----|-----------|------------|
| Mobile | React Native + Expo | Đúng bắt buộc môn học; tốc độ dựng UI; Android |
| Ngôn ngữ | JavaScript/TypeScript | Phù hợp Express + RN |
| Backend | Node.js + Express | Nhẹ, phổ biến, đủ cho REST CRUD |
| Auth | JWT + Auth Service riêng | Tách trách nhiệm xác thực; học được biên giới service mà không phình hệ thống |
| API nghiệp vụ | Core API (Express) | Một process cho toàn bộ domain LMS |
| CSDL | MongoDB **hoặc** MySQL | Đúng danh mục môn cho phép; nhóm chốt một loại khi bắt đầu Sprint DB |
| Tài liệu API | Swagger/OpenAPI (khuyến nghị) | Đồng bộ contract mobile–backend |

## 4.2. Cấu trúc thư mục repository

```text
lms-classroom-app/
├── apps/mobile/           # Expo React Native
├── services/
│   ├── auth-service/      # Cổng xác thực
│   └── core-api/          # Nghiệp vụ LMS
├── docs/                  # Báo cáo + hướng dẫn (bộ tài liệu này)
├── CONTEXT.md             # Thuật ngữ miền (glossary)
├── SCOPE.md               # Phạm vi MVP tóm tắt
└── README.md              # Điểm vào cho người chấm / dev mới
```

## 4.3. Nhật ký quyết định kiến trúc (ADR)

| Mã | Quyết định | Tóm tắt |
|----|------------|---------|
| ADR-0001 | Greenfield + Auth sidecar | Không salvage monorepo microservices cũ; chỉ Auth tách riêng khỏi Core API |
| ADR-0002 | Docs/repo độc lập với 30Shine | Hai đề tài song song, tài liệu và GitHub tách biệt |

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
