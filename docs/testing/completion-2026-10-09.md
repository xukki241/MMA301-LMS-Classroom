# LMS completion verification — 2026-10-09 (UTC+7)

Production acceptance remains **blocked**. This report distinguishes fresh verification from the Cursor handoff; it is not a human reviewer sign-off and does not mark any Notion card Done.

## Source and changes

- Checkout: `fix/mobile-error-overlap`, HEAD `e28b7f3`. Remote `main` was verified as `fc7cfd0`; their source trees were identical before this work. Local `main` was stale and was not moved.
- New uncommitted backend lockfile patches: Express 4.22.3, body-parser 1.20.8, proxy-addr 2.0.8, qs 6.16.0. These remain within existing manifest ranges.
- New uncommitted mobile transitive patches: brace-expansion 5.0.12, compression 1.8.2, shell-quote 1.12.0. Expo SDK 57 and React Native versions remain unchanged. No `audit fix --force` was used.
- Updated acceptance/runbook documentation to reflect optional Maestro, separate production Mongo URIs, and current staging verification.
- No commits, pushes, merges, Render mutations, or Notion updates were made. Patches are **local only**, not deployed.

## Fresh automated verification

Evidence directory: `test-results/completion-20261009/` (gitignored, local).

| Check | Result | Evidence |
|---|---|---|
| Typecheck: Auth, Core, mobile | PASS after patches | `final-typecheck.log` |
| OpenAPI route verification and schema validation | PASS; Auth 3 paths, Core 23 paths | `final-verify-docs.log`, `final-validate-docs.log` |
| Mobile unit suite | PASS 87/87 after patches | `final-test-mobile.log` |
| API integration suite | PASS after patches; LMS-08 35 checks, LMS-09 44 requests, LMS-14 permissions included | `final-test-api.log` |
| Contract smoke | PASS local after patches and deployed staging | `final-test-contract.log`, `contract.log` |
| Playwright Scalar | PASS 3/3 local after patches and staging | `final-scalar.log`, `scalar.log` |
| Selenium docs/health/OpenAPI | PASS local after patches and staging | `final-selenium.log`, `selenium.log` |
| Newman | PASS 29 assertions, 17 requests after patches | `final-test-newman.log` |
| Local performance | PASS; not a production capacity estimate | `final-test-performance.log` |
| Deployed staging business smoke | PASS: temporary accounts, login, create/join class, post/feed, exercise, submit, grade, student grade readback | `staging.log` |

The first local API run stopped because an explicitly supplied test database name failed LMS-09's safety guard. It was rerun with the suite's dedicated test databases and passed. Local Auth/Core were restarted after dependency patches, so the final local checks used the patched packages. Staging checks exercised the deployed code, not the new local lockfiles.

## LMS-14 Android evidence

Device: Pixel_10 / emulator-5554, package `com.mma301.lmsclassroom`, existing debug dev-client with Metro JavaScript. No new APK was built. The existing staging QA teacher session and its disposable class were used.

| Case | Actual result | Screenshot in evidence directory |
|---|---|---|
| Empty materials | Empty-state text and add action visible | `materials-empty.png` |
| Missing title | Required-title error shown; no item created | `materials-title-validation.png` |
| Missing URL | Required-URL error shown; no item created | `materials-url-validation.png` |
| Create and list | One new QA item displayed with expected title and URL | `materials-created.png` |
| Open URL | Android browser opened the configured URL and rendered its page | `materials-open-link.png` |
| Delete confirmation | Confirmation names the QA material | `materials-delete-confirm.png` |
| Delete result | List returns to empty state after confirmation | `materials-deleted.png` |

The material created in this run was deleted. Staging smoke accounts/classes/exercises remain disposable test data; no unrelated records were removed. This run covers the teacher materials flow, not a fresh student UI permissions journey. Permissions were exercised by LMS-14 API tests. Share, invalid URL scheme, offline materials behavior, and native release-binary parity are not claimed here.

Cursor's exercise/submission/grade, cache-isolation and keyboard-error screenshots remain inherited evidence in `test-results/mobile/`; those full device journeys were not repeated in this run.

## Dependency audit and unresolved gates

Audit ran in each independently installed package directory, not only the root. Summary: `audit-summary.json`.

| Package | Before patches | After patches |
|---|---|---|
| Root tooling, production dependency view | 0 | 0 |
| Auth | 1 critical, 3 moderate | 0 |
| Core | 1 critical, 3 moderate | 0 |
| Mobile | 1 critical, 31 high, 12 moderate | 0 critical, 29 high, 12 moderate |

The backend proxy-addr patch follows [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h). Advisory counts do not by themselves prove an exploitable application path. Mobile still fails the audit gate: 41 findings remain in its Expo/React Native dependency tree. Some npm suggestions downgrade Expo/React Native or cross SDK versions; those changes were not applied. Resolving or explicitly accepting the remaining findings requires compatibility and exposure review; no acceptance is implied by this report.

## Production and final review

Render inventory confirmed only `mma301-lms-auth-staging` and `mma301-lms-core-staging` in `XukKi_Garden`. The user corrected the earlier statement that production configuration was ready: no production service, environment group, or production variables exist.

Production requires rotated Mongo credentials, databases `lms_auth_prod` / `lms_core_prod`, a fresh JWT secret shared by the two production services, and exact CORS origins. See the [provisioning checklist](../deployment/runbook.md#production-provisioning-checklist). Shared environment groups must not assign one identical `MONGO_URI` to both services.

An independent agent reviewed the lockfile/docs diff and materials evidence. No Critical implementation finding was reported. Its missing-report, per-package-audit and deletion-evidence findings were addressed in this report/runbook and the post-delete screenshot. Human reviewer sign-off is still required.

The previously deferred materials count-chip safe-area issue was closed in the 2026-10-12 follow-up below. The warning banner seen in the older post-delete screenshot is a development-only reduced-motion warning and is not treated as production UI evidence.

Remaining work: resolve/accept mobile audit findings, review and commit the local patches, provision and smoke production, obtain human reviewer sign-off. Until these gates close, overall delivery remains incomplete.

## Follow-up verification — 2026-10-12 (UTC+7)

- Added an explicit 56 dp bottom tab bar with Android safe-area padding, three equal tab targets and keyboard-aware hiding. The web document now pins `html`, `body` and `#root` to the visible dynamic viewport.
- Added regression coverage for bottom navigation, viewport sizing and the populated materials safe area. The mobile suite increased from 87 to 90 tests.
- Pixel_10 runtime QA covered Trang chủ, Lớp học and Tôi. The native accessibility tree reported three 360 px-wide tab targets at `[0,2226][1080,2361]`; the selected state followed navigation.
- Keyboard QA confirmed the tab bar hides while the class-name input is focused. Empty submission rendered the field error below the input. Device inspection also found and fixed a 47 px overlap between the create button and the first class card; the verified post-fix gap is 105 px.
- Web QA at 414 × 896 reported a 56 px tab-bar container at viewport coordinates 840–896, with three 138 px-wide tabs and no document overflow.
- Expo SDK 57 patch dependencies were aligned to the versions required by `expo install --check`: Expo 57.0.27, expo-constants 57.0.21, expo-linking 57.0.12 and expo-router 57.0.25.
- A clean Android debug APK build completed successfully, was installed over the existing Pixel_10 app, and loaded through a cold Metro cache rebuild. The installed app exposed all three 360 px-wide bottom tabs without a React red box. The development-only reduced-motion warning was dismissed before the final layout screenshot.
- Fresh deployed checks passed: Playwright Scalar 3/3, Selenium Auth/Core docs plus health/OpenAPI, Newman 29/29, staging business smoke through grade readback, and the health performance probe with 0 errors/non-2xx and p99 916 ms.
- Docker Desktop was not running during this follow-up, so the destructive local API integration suite was not repeated. Its 2026-10-09 result remains historical evidence; the current follow-up instead re-ran the non-destructive contracts and the full disposable-account staging journey.
- Fresh production-dependency audit: root, Auth and Core remain at 0 findings. Mobile now reports 40 transitive toolchain findings (28 high, 12 moderate, 0 critical). npm's available-force fixes require incompatible major downgrades (including Expo 44 and React Native 0.72), so they were not applied. The current command host uses Node 22.11.0, while React Native 0.86.3 declares 22.13.0 or newer; CI and developer environments should use a supported Node release.

The source/UI work in this follow-up can be reviewed and merged independently. Production provisioning, the mobile dependency-risk decision and human release sign-off remain release-level gates rather than claims made by this source PR.
