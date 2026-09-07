# Nginx (LAN nhiều thành viên) và Render (mobile consume API)

Hai môi trường **không dùng chung một topology**. Đừng chạy nginx như Web Service riêng trên Render Free.

| Môi trường | Cổng vào | Thành phần |
|------------|----------|------------|
| **Local / LAN nhóm** | `http://<IP-máy-host>:8080` | nginx → auth-service + core-api + Mongo Docker |
| **Render (production demo)** | 2 URL HTTPS | Mỗi API một Web Service, bind `0.0.0.0:$PORT`. MongoDB Atlas. Không nginx |

Lý do: Render Free/Starter = **một app per service**; filesystem ephemeral; `$PORT` do platform gán. Gom nginx + Node trong một container (supervisor) phức tạp hơn lợi ích đồ án. Mobile đã có `EXPO_PUBLIC_AUTH_URL` và `EXPO_PUBLIC_CORE_URL` — khớp 2 service.

## 1. Local — nhiều thành viên hit cùng API

Máy **host** (cài Docker Desktop):

```bash
copy .env.example .env
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:8080/health/auth
curl http://127.0.0.1:8080/health/core
```

Seed (chạy trên host, Mongo map cổng 27018):

```bash
cd services/auth-service
npm install
npm run seed
```

Lấy IPv4 LAN (`ipconfig` → Wireless/Ethernet). Thành viên khác và máy thật:

```env
EXPO_PUBLIC_AUTH_URL=http://192.168.x.x:8080
EXPO_PUBLIC_CORE_URL=http://192.168.x.x:8080
```

Cả hai URL trỏ **cùng nginx**: `/auth/*` → Auth, còn lại → Core.

Mở firewall Windows cho cổng **8080** (inbound). Giả lập Android trên chính máy host vẫn có thể dùng `http://10.0.2.2:8080`.

Hot-reload khi code API: chỉ chạy Mongo + npm:

```bash
docker compose up -d mongo
npm run dev:auth
npm run dev:core
```

Khi đó nginx không đứng trước — mobile trỏ `4001` / `4002` (hoặc IP LAN hai cổng).

Redis (tùy chọn, khi làm chat Socket.IO sau MVP):

```bash
docker compose --profile realtime up -d
```

## 2. Render — checklist (chưa tạo service cho đến khi nhóm confirm)

1. Repo GitHub: `xukki241/MMA301-LMS-Classroom`.
2. Tạo cluster **MongoDB Atlas** (M0). Network Access: `0.0.0.0/0` (demo) hoặc IP Render. Hai database: `lms_auth`, `lms_core` (hoặc hai URI khác DB).
3. Dashboard Render → **New Blueprint** → chọn repo → file `render.yaml` → Apply khi đã sẵn sàng.
4. Điền secret (`sync: false`): `JWT_SECRET` (cùng giá trị cho cả hai service), `MONGO_URI` từng service.
5. Health: `GET /health` phải 200 (Mongo connected).
6. Cold start Free: service ngủ sau ~15 phút inactivity — request đầu có thể chậm.
7. Mobile production:

```env
EXPO_PUBLIC_AUTH_URL=https://lms-auth-service.onrender.com
EXPO_PUBLIC_CORE_URL=https://lms-core-api.onrender.com
```

(URL thật lấy từ Dashboard sau khi deploy.)

Không commit `.env`. Không hardcode API key.

## 3. Chat concurrent — còn thiếu

MVP **không** có Socket.IO (xem `SCOPE.md`). nginx đã reverse-proxy `/socket.io/` + Upgrade headers. Khi làm chat cần:

- Socket.IO trên Core API, path `/socket.io/`
- Redis adapter (`REDIS_URI`) nếu Render scale > 1 instance
- JWT khi `connection` (đừng tin `socket.id` là user)
- Không lưu session chat in-memory nếu có nhiều process
