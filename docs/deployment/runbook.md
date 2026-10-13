# Deployment runbook

## Architecture decision

The MVP backend is Node/Express + MongoDB + JWT. Firebase in this repository is only prepared for Firestore rules, Storage rules and the Android app identity; it is not the source of truth for LMS data. Deploying the Node services to Firebase Hosting alone would not run the backend.

The checked-in [`render.yaml`](../../render.yaml) is the deployment blueprint for the two Docker services. MongoDB must be a managed Atlas database (staging and production databases must be separate).

## Required external values

Set these in Render Dashboard or via the Render CLI secret workflow. Never commit them:

- `JWT_SECRET`: a unique random secret, at least 32 characters;
- `MONGO_URI`: the Atlas connection string for the matching environment;
- `CORS_ORIGIN`: the exact mobile/web origins, not `*` in production.

The same JWT secret must be used by Auth and Core in one environment. Staging and production must use different secrets and databases.

## Staging sequence

1. Create an Atlas staging database and allow only the required Render egress/network access.
2. Create a Render Blueprint from `render.yaml`.
3. Set the three secret values for both services.
4. Deploy the Blueprint and wait for `/health` to report `ok: true` and `mongo: up`.
5. Run the smoke gate against the deployed URLs:

```powershell
$env:AUTH_URL = "https://<staging-auth-host>"
$env:CORE_URL = "https://<staging-core-host>"
npm run test:staging
npm run test:contract
npm run test:newman
npm run test:selenium
npm run test:performance
```

6. Open both `/docs` pages and `/openapi.json`; run the Playwright Scalar check with the staging base URLs if configured.
7. Run the Android smoke flow with the mobile `.env` pointing to staging, then collect screenshots and logs in `test-reports/`.

## Production gate

Production is permitted only when the required local checks and staging smoke below are green, Atlas connectivity is confirmed, dependency findings have been resolved or explicitly accepted, and no P0–P3 critical-path defect is open. After deploy, run health, teacher/student login, class create/join, submission/grade, Scalar/OpenAPI and rate-limit smoke. A failed post-deploy smoke means rollback and no `Runtime verified` status.

The handoff excludes Maestro from the required release gate. Run the required commands individually: `typecheck`, `verify:docs`, `validate:docs`, `test:mobile`, `test:contract`, `test:scalar`, `test:selenium`, `test:api`, `test:newman`, and `test:performance`. Run `npm audit --omit=dev` independently at the root and with `--prefix services/auth-service`, `--prefix services/core-api`, and `--prefix apps/mobile`; a clean root audit does not cover the three separate dependency trees. The legacy `release:gate` script still includes optional `test:e2e`. Run integration and performance suites against an isolated local test stack; use deployed contract/browser/business smoke against staging and production. Do not run destructive integration suites against production.

### Production provisioning checklist

As verified on 2026-10-09, workspace `XukKi_Garden` contains only the two staging services. The user clarified that no production services, environment group, or production variables have been configured yet.

1. Rotate the previously exposed Mongo credential in Atlas. Prepare distinct databases `lms_auth_prod` and `lms_core_prod` and limit the production user's access appropriately.
2. Create a new production JWT secret and use the same value in Auth and Core. Never copy the staging secret.
3. Set the exact allowed web origins in `CORS_ORIGIN`; native Android requests without an Origin header do not supply a frontend URL. Do not substitute `*` or a guessed website.
4. Create two separate Docker web services from the repository's `main` branch, named `mma301-lms-auth-production` and `mma301-lms-core-production`, using the Docker paths, ports and `/health` checks in `render.yaml`. Select the intended plan explicitly (free unless approved otherwise) and keep manual deployment if following staging's policy. The existing blueprint uses generic names; review the names before applying it.
5. An optional shared `lms-prod` environment group may contain `JWT_SECRET` and `CORS_ORIGIN`. Set **`MONGO_URI` on each service separately**: Auth must point to `lms_auth_prod`, Core to `lms_core_prod`. A single shared `MONGO_URI` would put both services in the same database.
6. Confirm the deployed commit, wait for both services to be Live, then verify `/health` reports Mongo up, `/docs`, `/openapi.json`, allowed/rejected browser-origin preflights, and the teacher/student business flow. `SMOKE_REGISTER_TEMP=1` creates disposable QA accounts and class content; use it intentionally and record retained test data.
7. Attach redacted evidence and obtain human reviewer sign-off. Successful staging checks do not close production acceptance.

Enter secret values directly into Atlas/Render. Do not put them in the report, screenshots, Git or chat.

## Firebase checklist

Firebase Console setup remains a separate, optional mobile distribution step. Before enabling it, replace the placeholder project ID in `firebase/.firebaserc`, register package `com.mma301.lmsclassroom`, and keep `google-services.json` out of Git. Do not move Auth or LMS domain data to Firestore without a new architecture decision.
