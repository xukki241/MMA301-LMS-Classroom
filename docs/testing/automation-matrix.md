# Automation Matrix

| Suite | Command | Scope |
|---|---|---|
| Docs manifest | `npm run verify:docs` | Auth/Core route-to-OpenAPI coverage |
| Type safety | `npm run typecheck` | Auth, Core and mobile |
| Mobile tests | `npm run test:mobile` | API/query/UI behavior tests |
| Backend scripts | `npm run test:api` | LMS-05/06/08/09/14 integration flows |
| Docs smoke | `npm run test:contract` | `/docs`, `/openapi.json`, token helpers |
| API collection | `npm run test:newman` | Full Postman regression when Newman is installed |
| Scalar browser | `npm run test:scalar` | Playwright docs/try-it-out smoke |
| Selenium browser | `npm run test:selenium` | Headless Chrome checks Auth/Core Scalar pages, health and Core OpenAPI; saves screenshots and JSON report |
| Staging smoke | `npm run test:staging` | Health, OpenAPI, docs lock, login; with `SMOKE_REGISTER_TEMP=1` also runs class → post → exercise → submission → grade journey (see `docs/testing/scenario-matrix.md`) |
| Android smoke | `npm run test:e2e` | Optional Maestro auth smoke on Pixel_10 when `MAESTRO_EMAIL`/`MAESTRO_PASSWORD` are set; not required for manual handover |
| Release gate | `npm run release:gate` | Full local gate including e2e; skip `test:e2e` for a docs/mobile/API-only run |

Failures must preserve logs, request IDs, screenshots and traces. A retry may diagnose a flaky test but cannot hide the first failure.

Selenium and Playwright intentionally overlap on the public API documentation
surface: Playwright is the fast browser contract check, while Selenium proves
the team can run the requested WebDriver workflow and saves reviewable browser
screenshots under `test-results/selenium/`. API regression remains Newman and
native Android smoke remains Maestro.
