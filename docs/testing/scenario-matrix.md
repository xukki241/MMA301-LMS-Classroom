# Test scenario matrix (Auth + Core)

Environment variables for staging smoke with temporary accounts (no secrets in logs):

```powershell
$env:AUTH_URL = "https://mma301-lms-auth-staging.onrender.com"
$env:CORE_URL = "https://mma301-lms-core-staging.onrender.com"
$env:SMOKE_REGISTER_TEMP = "1"
npm run test:staging   # full journey when SMOKE_REGISTER_TEMP=1
npm run test:newman    # same credentials when SMOKE_REGISTER_TEMP=1; grade wait needs ~90s (`SMOKE_DUE_OFFSET_SEC`, `NEWMAN_GRADE=0` to skip)
npm run test:selenium  # docs/health/OpenAPI only
```

| Case ID | Role | Endpoint / UI | Expected | Owner |
|---|---|---|---|---|
| AUTH-01 | anonymous → teacher/student | `POST /auth/register` | 201, user contract | smoke, newman (temp register) |
| AUTH-02 | anonymous | invalid register body | 400 + requestId | manual, test:api (local) |
| AUTH-03 | teacher, student | `POST /auth/login` | 200, JWT (not logged) | smoke, newman |
| AUTH-04 | anonymous | wrong password / bad token | 401/400 | manual |
| DOC-01 | anonymous | Auth `/docs`, `/openapi.json` | 200, Scalar renders | selenium, smoke, test:contract |
| DOC-02 | anonymous | Core `/docs`, `/openapi.json` | 200, paths include classes/exercises | selenium, smoke |
| DOC-03 | anonymous | `POST /docs/tokens/*` on staging | 403 unless `EXPECT_DEV_TOKENS=1` | smoke |
| CLASS-01 | teacher | `POST /classes` | 201, 6-char code | smoke, newman |
| CLASS-02 | student | `POST /classes` | 403 | newman (partial), manual |
| CLASS-03 | student | `POST /classes/join` | 200, role student | smoke, newman |
| CLASS-04 | non-owner teacher | mutate foreign class | 403 | manual, test:api |
| CLASS-05 | any | malformed `classId` | 400 | manual |
| STREAM-01 | teacher | `POST .../posts` | 201 | smoke, newman |
| STREAM-02 | student | `GET .../posts` | 200, feed contains post | smoke, newman |
| STREAM-03 | student | `POST .../posts` | 403 | newman |
| EXER-01 | teacher | `POST .../exercises` | 201, future `dueAt` | smoke, newman |
| EXER-02 | teacher | past `dueAt` | 400 | manual, test:api |
| SUB-01 | student | `POST .../submissions` | 201 before due | smoke, newman |
| SUB-02 | student | duplicate submit | 409 | manual, test:api |
| SUB-03 | teacher | `PUT .../grade` after due | 200, score 0–10 | smoke, newman |
| SUB-04 | student | `GET .../submissions/mine` | grade visible | smoke, newman |
| SEC-01 | any | oversized body | 400/413 | manual |
| SEC-02 | any | rate limit burst | 429 | manual |
| DEP-01 | QA automation | health + auth + full core journey | all steps pass | smoke (`test:staging`) |
| MOB-01 | mobile user | loading / error UI | usable states | manual, test:mobile |
| MOB-02 | mobile user | a11y (font, contrast) | no clipped UI | manual |
| E2E-01 | Android | Maestro auth + class entry | smoke path | test:e2e (Maestro) |

Gaps intentionally manual: validation matrices (AUTH-02, SEC-*), ownership edge cases (CLASS-04), reactions/materials streams, offline/mobile a11y, rate limiting.
