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
| Android smoke | `npm run test:e2e` | Maestro auth smoke on Pixel_10; full class/material/exercise/submission journey remains manual |
| Release gate | `npm run release:gate` | All locally available mandatory gates |

Failures must preserve logs, request IDs, screenshots and traces. A retry may diagnose a flaky test but cannot hide the first failure.

The repository does not currently contain a Selenium suite. Do not report
Selenium as executed; browser documentation checks use Playwright, API
regression uses Newman, and the native Android smoke uses Maestro.
