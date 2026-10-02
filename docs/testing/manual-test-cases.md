# Manual Acceptance Test Cases

| ID | Area | Preconditions | Expected |
|---|---|---|---|
| AUTH-01 | Register | Auth + Mongo up | Valid user returns 201 and user contract |
| AUTH-02 | Register validation | Empty/invalid email, short password, extra field | 400 validation error with requestId |
| AUTH-03 | Login | Seed teacher/student | 200, JWT and correct role |
| AUTH-04 | Login failure | Wrong password / malformed token | 400/401, no sensitive detail |
| DOC-01 | Scalar Auth | Auth running | `/docs` renders and `/openapi.json` is valid |
| DOC-02 | Scalar Core | Core running | Every documented operation is visible and executable |
| CLASS-01 | Create class | Teacher token | 201, generated six-character code |
| CLASS-02 | Student create class | Student token | 403 |
| CLASS-03 | Join class | Student token + valid code | 200; duplicate join is rejected |
| CLASS-04 | Class ownership | Non-owner teacher modifies/deletes | 403 |
| CLASS-05 | Invalid class ID | Malformed ObjectId | 400, documented error |
| STREAM-01 | Posts/comments | Class member | List/create/update/delete follows ownership rules |
| STREAM-02 | Reactions | Class member | Toggle/list is idempotent and scoped to post |
| MATERIAL-01 | Materials | Teacher/student class member | List works; write permissions enforced |
| EXERCISE-01 | Exercise | Teacher owns class | Create/list works; past due date rejected |
| SUB-01 | Submit | Student + future exercise | Create and update own submission |
| SUB-02 | Duplicate/cross-user | Existing submission / other student | 409 or 403, never data leak |
| SUB-03 | Grade | Teacher owns class, after due date | Score 0-10 accepted; invalid score rejected |
| SEC-01 | Payload abuse | Oversized/malformed body | 400/413, process remains healthy |
| SEC-02 | Rate limit | Repeated auth/mutation request | 429 and Retry-After |
| MOB-01 | Loading states | Android emulator | Skeleton, error, empty and retry states are usable |
| MOB-02 | Accessibility | Dark mode, large font, reduced motion | No clipped content or unusable control |
| DEP-01 | Post-deploy smoke | Render + Atlas | Health, login, class and assignment flow pass |

For every case record date, environment, build/commit, tester, result, screenshot/log and defect ID if failed.
