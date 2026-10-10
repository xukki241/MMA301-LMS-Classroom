# Release Acceptance Checklist

- [ ] Dedicated test Mongo is healthy and seeded.
- [ ] Auth and Core typecheck/build pass.
- [ ] Auth/Core OpenAPI manifests pass with no route drift.
- [ ] Scalar `/docs` and `/openapi.json` pass browser smoke.
- [ ] API integration and Postman/Newman suites pass.
- [ ] Mobile unit/query suite passes.
- [ ] Maestro critical paths pass three consecutive runs.
- [ ] Manual Android cases pass on Pixel_10.
- [ ] No unexpected 5xx, unhandled rejection or console error.
- [ ] Performance baseline is recorded and not regressed.
- [ ] No open P0-P3 defect in MVP scope.
- [ ] Staging smoke passes before production deployment.
- [ ] Production post-deploy smoke passes.
- [ ] Notion evidence links are attached and status is Runtime verified.
