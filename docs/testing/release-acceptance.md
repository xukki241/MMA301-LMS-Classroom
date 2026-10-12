# Release Acceptance Checklist

- [ ] Dedicated test Mongo is healthy and seeded.
- [ ] Auth and Core typecheck/build pass.
- [ ] Auth/Core OpenAPI manifests pass with no route drift.
- [ ] Scalar `/docs` and `/openapi.json` pass browser smoke.
- [ ] API integration and Postman/Newman suites pass.
- [ ] Mobile unit/query suite passes.
- [ ] Manual Android critical paths have screenshots and actual results; Maestro is optional and is not a release gate.
- [ ] Manual Android cases pass on Pixel_10.
- [ ] No unexpected 5xx, unhandled rejection or console error.
- [ ] Performance baseline is recorded and not regressed.
- [ ] No open P0-P3 defect in MVP scope.
- [ ] Staging smoke passes before production deployment.
- [ ] Production post-deploy smoke passes.
- [ ] Notion evidence links are attached and status is Runtime verified.
- [ ] Human reviewer has signed off before marking delivery cards Done.

Latest verification and remaining blockers: [2026-10-09 completion report](completion-2026-10-09.md).
