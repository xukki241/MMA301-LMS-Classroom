# LMS-23 manual runtime checklist

Use an Android emulator or device with the mobile app, Auth Service, and Core API running. Test with both a teacher and student account. Record device, build, API environment, date, and each observed result. Automated tests use stubbed HTTP/storage; airplane mode remains a device check.

## Copy-ready staging run

Use only temporary staging accounts and a staging database. Never paste a real password or production token into this document.

| Key | Value to enter | Expected result |
| --- | --- | --- |
| `EXPO_PUBLIC_AUTH_URL` | `https://<auth-staging-host>` | Login/register requests go to staging Auth |
| `EXPO_PUBLIC_CORE_URL` | `https://<core-staging-host>` | Class/Stream requests go to staging Core |
| Teacher email | `qa.teacher.<timestamp>@example.test` | Teacher account can create a class |
| Teacher display name | `QA Teacher` | Home screen greets `QA` or the configured display name |
| Student email | `qa.student.<timestamp>@example.test` | Student account can join by class code |
| Password | A temporary staging password of at least 8 characters | Register/login returns success; keep it local |
| Class name | `QA Offline <timestamp>` | Teacher sees the class and its returned code |
| Offline post draft | `Offline should be rejected` | No post is created; error is `Không có kết nối mạng. Vui lòng kết nối Internet và thử lại.` |

PowerShell setup from the repository root:

```powershell
$env:EXPO_PUBLIC_AUTH_URL = "https://<auth-staging-host>"
$env:EXPO_PUBLIC_CORE_URL = "https://<core-staging-host>"
cd apps/mobile
npm run typecheck
npm test
npm run start
```

On the Android emulator, run the flow in this order:

1. Sign in with the temporary teacher account and create/open one class.
2. Confirm the class name and class code are visible; open **Bảng tin** once so its data is cached.
3. Turn on airplane mode, or disable Wi‑Fi/data on the device if the emulator does not emit a network event.
4. Relaunch the app. Expected: the offline banner is visible and the cached class remains visible.
5. Open the cached class and **Bảng tin**. Expected: previously loaded data remains available.
6. Enter `Offline should be rejected` and tap **Đăng bài**. Expected: the post is not created and the exact offline error appears.
7. Restore network. Expected: the banner disappears after refresh; normal server results load again.

Record the result in the table below. A screenshot is required for the offline banner and the rejected write; automated unit tests alone do not count as device evidence.

## A. Class cache

- [ ] Sign in online, open Home and Class list, and confirm fetched classes appear.
- [ ] Enable airplane mode, return to Class list, pull to refresh, and relaunch the app while still offline.
- [ ] Confirm the same classes remain visible, the offline banner appears, and the app does not crash.
- [ ] Open a previously loaded class; confirm class detail and Stream navigation remain available. Member data may require network.
- [ ] Sign in as a second user after reconnecting, go offline, and confirm the first user's classes do not appear.
- [ ] On a fresh account without saved classes, go offline and confirm a clear no-cache error appears.

## B. Stream cache

- [ ] Online, open a class Stream and confirm posts load.
- [ ] Enable airplane mode, reopen/refresh Stream, then relaunch and reopen it.
- [ ] Confirm the previously fetched posts remain visible under the correct class and the banner appears.
- [ ] Open a different class that was never fetched and confirm its feed does not show posts from the first class.
- [ ] A separate comment request may show a network error; LMS-23 persists the post feed, not comment threads.

## C. Offline writes

- [ ] While offline, try Create Class, Join Class, Create Post, and Create Comment using valid input and an already loaded comment thread.
- [ ] Each action shows “Không có kết nối mạng. Vui lòng kết nối Internet và thử lại.”
- [ ] Confirm no success message, navigation to a new item, fabricated row, or pending action appears.
- [ ] Reconnect without repeating those actions; confirm they are not replayed automatically.

## D. Reconnect and regression

- [ ] Restore network; confirm the offline banner disappears.
- [ ] Refresh Class list and Stream; confirm current server results load.
- [ ] Teacher: create a class, open detail, inspect class code, create a post and comment.
- [ ] Student: join by code, open detail, view posts, comment, and confirm no Post composer is offered when membership does not permit it.
- [ ] Verify loading, empty, error/retry, and duplicate-submit handling remain functional.

## Automated checks for review

Run `npm run typecheck` and `npm test` in `apps/mobile`. Run `npx expo export --platform web` when checking bundling. Runtime airplane-mode results must be recorded separately from automated tests.
