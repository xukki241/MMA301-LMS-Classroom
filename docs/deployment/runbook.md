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
npm run test:performance
```

6. Open both `/docs` pages and `/openapi.json`; run the Playwright Scalar check with the staging base URLs if configured.
7. Run the Android smoke flow with the mobile `.env` pointing to staging, then collect screenshots and logs in `test-reports/`.

## Production gate

Production is permitted only when local and staging `release:gate` are green, Atlas connectivity is confirmed, and no P0–P3 critical-path defect is open. After deploy, run health, teacher/student login, class create/join, submission/grade, Scalar/OpenAPI and rate-limit smoke. A failed post-deploy smoke means rollback and no `Runtime verified` status.

## Firebase checklist

Firebase Console setup remains a separate, optional mobile distribution step. Before enabling it, replace the placeholder project ID in `firebase/.firebaserc`, register package `com.mma301.lmsclassroom`, and keep `google-services.json` out of Git. Do not move Auth or LMS domain data to Firestore without a new architecture decision.
