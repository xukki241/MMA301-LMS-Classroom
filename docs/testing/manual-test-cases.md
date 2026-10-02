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

## Copy-ready staging smoke

Use a dedicated staging/test database and test accounts only. Never paste a real
password, JWT, Mongo URI, or response containing a token into GitHub or Notion.

### 1. Fill the test variables

PowerShell example (replace only the URLs; keep the password in the local shell):

```powershell
$env:AUTH_URL = "https://<auth-staging-host>"
$env:CORE_URL = "https://<core-staging-host>"
$teacherEmail = "teacher+qa-20261002@example.test"
$studentEmail = "student+qa-20261002@example.test"
$password = "Use-a-local-test-password-123!"
$teacherToken = "PASTE_RESPONSE_TOKEN_LOCALLY"
$studentToken = "PASTE_RESPONSE_TOKEN_LOCALLY"
$classId = "PASTE_CLASS_ID_LOCALLY"
$classCode = "PASTE_CLASS_CODE_LOCALLY"
$exerciseId = "PASTE_EXERCISE_ID_LOCALLY"
$submissionId = "PASTE_SUBMISSION_ID_LOCALLY"
```

If staging does not permit creating temporary accounts, use the two accounts
provisioned by the team. Do not use the repository's local seed credentials on
public staging unless the team explicitly provisioned them there.

### 2. Execute in this order

| Step | Request / input | Expected result | Save as evidence |
|---|---|---|---|
| S-01 | `GET $AUTH_URL/health` | `200`, `ok=true`, and `mongo=up` | response + timestamp |
| S-02 | `GET $CORE_URL/health` | `200`, `ok=true` | response + timestamp |
| S-03 | `POST $AUTH_URL/auth/register` with `{ email, displayName: "QA Teacher", password, role: "teacher" }` | `201`; copy `token` only to local `$teacherToken` | status + redacted response |
| S-04 | Register the same shape with `role: "student"` | `201`; copy token locally to `$studentToken` | status + redacted response |
| S-05 | `POST $CORE_URL/classes` with teacher token and `{ name: "QA LMS <date>" }` | `201`; copy `class._id` and `class.code` locally | response with token removed |
| S-06 | `POST $CORE_URL/classes/join` with student token and `{ code: classCode }` | `200`; membership role is `student` | status + response |
| S-07 | `POST /classes/{classId}/posts` with teacher token | `201`; post has an `_id` | status + screenshot |
| S-08 | `GET /classes/{classId}/posts` with student token | `200`; the created post is visible | response + screenshot |
| S-09 | `POST /classes/{classId}/exercises` with teacher token and `{ title, description, dueAt: "<UTC now + 2 minutes>" }` | `201`; copy `exercise._id` locally | status + response |
| S-10 | `POST .../submissions` with student token and `{ content: "QA answer", url: "" }` | `201`; copy `submission._id` locally | status + response |
| S-11 | Wait until the exercise due time, then `PUT .../{submissionId}/grade` with teacher token and `{ score: 8.5, feedback: "Good" }` | `200`; grade score is `8.5` | status + redacted response |
| S-12 | `GET .../submissions/mine` with student token | `200`; own submission and grade are visible | screenshot + request ID |

For PowerShell, generate the due time without copying a literal local timezone:

```powershell
$dueAt = (Get-Date).ToUniversalTime().AddMinutes(2).ToString("o")
```

Use `$dueAt` in the JSON body, then submit before it expires and wait until it
expires before running S-11. Use the actual route prefixes shown in `/docs`; do not invent IDs or add
`classId`, `createdBy`, or `studentId` to request bodies. A successful status
without the expected response shape is a **FAIL**.

### 3. Negative checks

| Case | Change | Expected result |
|---|---|---|
| N-01 | Remove `Authorization` | `401`; no data is created |
| N-02 | Use student token to create a class/post/exercise | `403` |
| N-03 | Use malformed `classId` | `400` with documented error code |
| N-04 | Submit twice for the same exercise | second request `409` |
| N-05 | Send an unknown body field | `422` validation error |
| N-06 | Send score below `0` or above `10` | `400`/`422`; stored grade unchanged |

### 4. Mobile/offline recording form

For each row, copy this block into the QA report and replace the brackets:

```text
Case: MOB-01 / MOB-02 / LMS-23-01
Device + emulator: [Pixel_10 / physical model]
APK commit: [git commit]
API environment: [local / staging URL]
Precondition: [online class/feed already loaded]
Action: [airplane mode on; reopen Class/Stream; try one write]
Expected: [cached data remains; offline banner; write fails clearly; no fake row]
Actual: [what appeared]
Result: PASS / FAIL
Evidence: [screenshot/log path]
Request ID / defect: [value or none]
```

The automated mobile suite uses Node tests with stubbed HTTP/storage and
Maestro for the Android journey. It does **not** prove airplane-mode behavior.
The repository currently uses Playwright for Scalar browser checks; Selenium
is not part of the implemented automation and must not be reported as run.
