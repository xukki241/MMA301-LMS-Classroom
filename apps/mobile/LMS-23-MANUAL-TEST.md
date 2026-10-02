# LMS-23 manual runtime checklist

Use an Android emulator or device with the mobile app, Auth Service, and Core API running. Test with both a teacher and student account. Record device, build, API environment, date, and each observed result. Automated tests use stubbed HTTP/storage; airplane mode remains a device check.

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
