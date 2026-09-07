# Core API

Express + TypeScript. Sở hữu `lms_core`. Xác thực JWT local bằng `JWT_SECRET` chung với Auth Service (issuer `lms-auth-service`, audience `lms-core-api`).

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| GET | `/health` | không | Service + Mongo |
| GET | `/me` | Bearer | Payload user từ JWT |

Schema Class / Post / Material / Exercise đã có model + index. Route CRUD do Tú / Hưng / Huy implement.

```bash
npm install
npm run dev
npm run sync-indexes
```
