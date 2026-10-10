# LMS Release Test Plan

## Mục tiêu

Xác nhận critical path LMS chạy đúng từ Auth đến Class, Stream, Material, Exercise và Submission/Grade trên local, emulator Android và môi trường deploy.

## Test layers

| Layer | Tool | Gate |
|---|---|---|
| Mobile unit/query | Node `node:test` | 100% pass |
| Backend integration | TypeScript scripts + fetch | 100% pass |
| API regression | Postman/Newman | 100% pass |
| OpenAPI contract | route manifest + schema validator | no drift |
| Scalar browser | Playwright | docs load, try-it-out, no console error |
| Android E2E | Maestro + `Pixel_10` | critical journeys pass |
| Manual QA | Android Studio + Scalar | all P0-P3 cases pass |
| Performance | autocannon + request logs | baseline not regressed |

## Test data

Use a dedicated Mongo test database and seeded Teacher/Student accounts. Never run destructive suites against production data and never commit tokens.

## Exit criteria

Zero failed required tests, zero contract drift, zero open P0-P3 defects, zero unhandled errors, and evidence attached for every critical journey.
