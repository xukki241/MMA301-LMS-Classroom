# Requirements to Test Traceability

| Requirement | OpenAPI area | Automated coverage | Manual coverage |
|---|---|---|---|
| Auth/register/login | Auth Service | API + contract | AUTH-01..04 |
| Health/docs | `/health`, `/docs`, `/openapi.json` | docs smoke + Playwright | DOC-01..02 |
| Class RBAC/ownership | `/classes*` | LMS-05 + contract | CLASS-01..05 |
| Stream interactions | `/posts`, `/comments`, `/reactions` | LMS-06 + mobile tests | STREAM-01..02 |
| Materials | `/materials` | LMS-14 + contract | MATERIAL-01 |
| Exercises | `/exercises` | LMS-08 + permissions | EXERCISE-01 |
| Submission/grade | `/submissions` | LMS-09 + permissions | SUB-01..03 |
| Personal Tasks | `/tasks` | LMS-28 + mobile tests | TASK-01..04 |
| Abuse/error handling | error contract and limits | contract/security tests | SEC-01..02 |
| Mobile UX | React Native app | node tests + Maestro | MOB-01..02 |
| Deployment | Render/Atlas | smoke scripts | DEP-01 |

No requirement may be marked Runtime verified without a linked automated result and manual evidence where applicable.
