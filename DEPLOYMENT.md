# GitHub se Vercel Deployment (Automatic)

Project is now set up to deploy via GitHub Actions using:

- `.github/workflows/deploy-vercel.yml`

## Required GitHub Secrets

Repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**

Add these 3 secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## How to get values

1. Login to Vercel locally once:
   ```bash
   vercel login
   vercel link
   ```
2. In `.vercel/project.json`, copy:
   - `orgId` -> `VERCEL_ORG_ID`
   - `projectId` -> `VERCEL_PROJECT_ID`
3. Create token from Vercel dashboard:
   - Account Settings -> Tokens -> Create Token
   - Use token as `VERCEL_TOKEN`

## Deploy flow

- Push to `main` -> auto **production deploy**
- Pull Request to `main` -> auto **preview deploy**
- Manual trigger also available via **workflow_dispatch**
