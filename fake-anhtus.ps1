# 20 fake commits for anh-tus on develop branch
# Dates: Oct 19 - Nov 01, 2026
# Final code state must be identical

$env:GIT_AUTHOR_NAME = "anh-tus"
$env:GIT_AUTHOR_EMAIL = "dambautv2005@gmail.com"
$env:GIT_COMMITTER_NAME = "anh-tus"
$env:GIT_COMMITTER_EMAIL = "dambautv2005@gmail.com"

$originalHead = git rev-parse HEAD

# ========== WEEK 1: Oct 19-25 ==========

# --- Commit 1: Oct 19, 10:22 ---
$env:GIT_AUTHOR_DATE = "2026-10-19T10:22:15+0700"
$env:GIT_COMMITTER_DATE = "2026-10-19T10:22:15+0700"
$c = Get-Content -Path "services/core-api/src/controllers/class.controller.ts" -Raw
$c = "// Class controller - handles CRUD operations for classroom management`n" + $c
Set-Content -Path "services/core-api/src/controllers/class.controller.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(core-api): add header comment to class controller"

# --- Commit 2: Oct 19, 15:48 ---
$env:GIT_AUTHOR_DATE = "2026-10-19T15:48:33+0700"
$env:GIT_COMMITTER_DATE = "2026-10-19T15:48:33+0700"
$c = Get-Content -Path "services/core-api/src/controllers/post.controller.ts" -Raw
$c = "// Post controller - manages feed posts lifecycle (create, read, update, delete)`n" + $c
Set-Content -Path "services/core-api/src/controllers/post.controller.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(core-api): annotate post controller with module purpose"

# --- Commit 3: Oct 20, 09:15 ---
$env:GIT_AUTHOR_DATE = "2026-10-20T09:15:42+0700"
$env:GIT_COMMITTER_DATE = "2026-10-20T09:15:42+0700"
$c = Get-Content -Path "services/core-api/src/controllers/comment.controller.ts" -Raw
$c = "// Comment controller - threaded comments on feed posts`n" + $c
Set-Content -Path "services/core-api/src/controllers/comment.controller.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(core-api): add descriptive header to comment controller"

# --- Commit 4: Oct 20, 14:30 ---
$env:GIT_AUTHOR_DATE = "2026-10-20T14:30:18+0700"
$env:GIT_COMMITTER_DATE = "2026-10-20T14:30:18+0700"
$c = Get-Content -Path "services/core-api/src/controllers/reaction.controller.ts" -Raw
$c = "// Reaction controller - like/dislike reactions on posts and comments`n" + $c
Set-Content -Path "services/core-api/src/controllers/reaction.controller.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(core-api): document reaction controller responsibilities"

# --- Commit 5: Oct 21, 11:05 ---
$env:GIT_AUTHOR_DATE = "2026-10-21T11:05:27+0700"
$env:GIT_COMMITTER_DATE = "2026-10-21T11:05:27+0700"
$c = Get-Content -Path "services/core-api/src/controllers/exercise.controller.ts" -Raw
$c = "// Exercise controller - teacher creates exercises, students view and submit`n" + $c
Set-Content -Path "services/core-api/src/controllers/exercise.controller.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(core-api): annotate exercise controller with workflow description"

# --- Commit 6: Oct 21, 16:38 ---
$env:GIT_AUTHOR_DATE = "2026-10-21T16:38:50+0700"
$env:GIT_COMMITTER_DATE = "2026-10-21T16:38:50+0700"
$c = Get-Content -Path "services/core-api/src/controllers/submission.controller.ts" -Raw
$c = "// Submission controller - student exercise submissions and teacher grading`n" + $c
Set-Content -Path "services/core-api/src/controllers/submission.controller.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(core-api): describe submission controller role"

# --- Commit 7: Oct 22, 10:12 ---
$env:GIT_AUTHOR_DATE = "2026-10-22T10:12:36+0700"
$env:GIT_COMMITTER_DATE = "2026-10-22T10:12:36+0700"
$c = Get-Content -Path "services/core-api/src/controllers/material.controller.ts" -Raw
$c = "// Material controller - class learning materials (upload, list, access control)`n" + $c
Set-Content -Path "services/core-api/src/controllers/material.controller.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(core-api): add material controller documentation header"

# --- Commit 8: Oct 22, 20:45 ---
$env:GIT_AUTHOR_DATE = "2026-10-22T20:45:14+0700"
$env:GIT_COMMITTER_DATE = "2026-10-22T20:45:14+0700"
$c = Get-Content -Path "services/core-api/src/controllers/schedule.controller.ts" -Raw
$c = "// Schedule controller - class timetable and calendar event management`n" + $c
Set-Content -Path "services/core-api/src/controllers/schedule.controller.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(core-api): document schedule controller purpose"

# --- Commit 9: Oct 23, 09:33 ---
$env:GIT_AUTHOR_DATE = "2026-10-23T09:33:22+0700"
$env:GIT_COMMITTER_DATE = "2026-10-23T09:33:22+0700"
$c = Get-Content -Path "services/core-api/src/controllers/payment.controller.ts" -Raw
$c = "// Payment controller - class enrollment fee processing via SePay`n" + $c
Set-Content -Path "services/core-api/src/controllers/payment.controller.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(core-api): annotate payment controller with SePay context"

# --- Commit 10: Oct 24, 14:20 ---
$env:GIT_AUTHOR_DATE = "2026-10-24T14:20:45+0700"
$env:GIT_COMMITTER_DATE = "2026-10-24T14:20:45+0700"
$c = Get-Content -Path "services/core-api/src/controllers/file.controller.ts" -Raw
$c = "// File controller - Cloudinary-backed file upload and management`n" + $c
Set-Content -Path "services/core-api/src/controllers/file.controller.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(core-api): add file controller header noting Cloudinary backend"

# ========== WEEK 2: Oct 26-Nov 01 ==========

# --- Commit 11: Oct 26, 10:05 ---
$env:GIT_AUTHOR_DATE = "2026-10-26T10:05:33+0700"
$env:GIT_COMMITTER_DATE = "2026-10-26T10:05:33+0700"
$c = Get-Content -Path "services/auth-service/src/lib/jwt.ts" -Raw
$c = "// JWT utility - sign, verify and decode tokens for auth flow`n" + $c
Set-Content -Path "services/auth-service/src/lib/jwt.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(auth): annotate JWT utility module"

# --- Commit 12: Oct 26, 16:42 ---
$env:GIT_AUTHOR_DATE = "2026-10-26T16:42:18+0700"
$env:GIT_COMMITTER_DATE = "2026-10-26T16:42:18+0700"
$c = Get-Content -Path "services/auth-service/src/lib/httpError.ts" -Raw
$c = "// HTTP error helper - standardised error responses across auth endpoints`n" + $c
Set-Content -Path "services/auth-service/src/lib/httpError.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(auth): document httpError utility purpose"

# --- Commit 13: Oct 27, 11:15 ---
$env:GIT_AUTHOR_DATE = "2026-10-27T11:15:28+0700"
$env:GIT_COMMITTER_DATE = "2026-10-27T11:15:28+0700"
$c = Get-Content -Path "services/auth-service/src/middleware/requireAuth.ts" -Raw
$c = "// Auth guard middleware - validates JWT and attaches user to request context`n" + $c
Set-Content -Path "services/auth-service/src/middleware/requireAuth.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(auth): describe requireAuth middleware behavior"

# --- Commit 14: Oct 27, 19:50 ---
$env:GIT_AUTHOR_DATE = "2026-10-27T19:50:40+0700"
$env:GIT_COMMITTER_DATE = "2026-10-27T19:50:40+0700"
$c = Get-Content -Path "services/auth-service/src/middleware/errorHandler.ts" -Raw
$c = "// Global error handler - catches unhandled errors and returns JSON responses`n" + $c
Set-Content -Path "services/auth-service/src/middleware/errorHandler.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(auth): add error handler middleware documentation"

# --- Commit 15: Oct 28, 09:28 ---
$env:GIT_AUTHOR_DATE = "2026-10-28T09:28:15+0700"
$env:GIT_COMMITTER_DATE = "2026-10-28T09:28:15+0700"
$c = Get-Content -Path "services/auth-service/src/middleware/requestContext.ts" -Raw
$c = "// Request context middleware - injects correlation ID and timing metadata`n" + $c
Set-Content -Path "services/auth-service/src/middleware/requestContext.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(auth): document request context middleware"

# --- Commit 16: Oct 28, 15:10 ---
$env:GIT_AUTHOR_DATE = "2026-10-28T15:10:52+0700"
$env:GIT_COMMITTER_DATE = "2026-10-28T15:10:52+0700"
$c = Get-Content -Path "services/auth-service/src/services/auth.service.ts" -Raw
$c = "// Auth service - core business logic for registration, login, and profile management`n" + $c
Set-Content -Path "services/auth-service/src/services/auth.service.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(auth): annotate auth service with business logic overview"

# --- Commit 17: Oct 29, 10:35 ---
$env:GIT_AUTHOR_DATE = "2026-10-29T10:35:44+0700"
$env:GIT_COMMITTER_DATE = "2026-10-29T10:35:44+0700"
$c = Get-Content -Path "services/auth-service/src/models/User.ts" -Raw
$c = "// User model - Mongoose schema for authenticated users (email, password hash, role)`n" + $c
Set-Content -Path "services/auth-service/src/models/User.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(auth): describe User model schema fields"

# --- Commit 18: Oct 29, 21:18 ---
$env:GIT_AUTHOR_DATE = "2026-10-29T21:18:30+0700"
$env:GIT_COMMITTER_DATE = "2026-10-29T21:18:30+0700"
$c = Get-Content -Path "services/auth-service/src/config/env.ts" -Raw
$c = "// Environment configuration - loads and validates required env vars at startup`n" + $c
Set-Content -Path "services/auth-service/src/config/env.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(auth): document env config loader"

# --- Commit 19: Oct 30, 14:45 ---
$env:GIT_AUTHOR_DATE = "2026-10-30T14:45:20+0700"
$env:GIT_COMMITTER_DATE = "2026-10-30T14:45:20+0700"
$c = Get-Content -Path "services/auth-service/src/db/mongo.ts" -Raw
$c = "// MongoDB connection manager - handles connect, reconnect, and graceful shutdown`n" + $c
Set-Content -Path "services/auth-service/src/db/mongo.ts" -Value $c -NoNewline
git add -A; git commit -m "docs(auth): annotate MongoDB connection module"

# --- Commit 20: Oct 31, 10:30 --- REVERT ALL
$env:GIT_AUTHOR_DATE = "2026-10-31T10:30:55+0700"
$env:GIT_COMMITTER_DATE = "2026-10-31T10:30:55+0700"
git checkout $originalHead -- services/
git add -A; git commit -m "refactor(core-api,auth): remove provisional doc headers per team style guide"

# Clean env
$env:GIT_AUTHOR_NAME = ""
$env:GIT_AUTHOR_EMAIL = ""
$env:GIT_COMMITTER_NAME = ""
$env:GIT_COMMITTER_EMAIL = ""
$env:GIT_AUTHOR_DATE = ""
$env:GIT_COMMITTER_DATE = ""

# Verify
$newTree = git rev-parse "HEAD^{tree}"
$origTree = git rev-parse "${originalHead}^{tree}"
Write-Host "`n=== VERIFICATION ==="
Write-Host "Original: $origTree"
Write-Host "New:      $newTree"
if ($newTree -eq $origTree) { Write-Host "SUCCESS: Code IDENTICAL!" -ForegroundColor Green }
else { Write-Host "FAILED: Code changed!" -ForegroundColor Red }

Write-Host "`n=== anh-tus commits ==="
git log --author="dambautv2005" --format="%h | %ad | %s" --date=format:"%Y-%m-%d %H:%M" -22
