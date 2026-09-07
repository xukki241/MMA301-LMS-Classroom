# Auth Service

Express + TypeScript. Sở hữu `lms_auth.users`, phát hành JWT.

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/health` | Service + Mongo |
| POST | `/auth/register` | `{ email, password, displayName, role }` |
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |

```bash
npm install
npm run dev
npm run seed
```
