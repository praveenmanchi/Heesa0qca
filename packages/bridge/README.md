# Bridge (Tokens Studio for Figma)

Figma plugin for syncing design tokens, managing variables, and generating style guides.

## Setup

```bash
# Install dependencies (from monorepo root or this package)
yarn install

# Copy environment template
cp .env.example .env
# Or for production config:
cp .env.production.example .env
```

## Build

```bash
# Production build
yarn build

# Development build (faster, with source maps)
yarn build:dev

# Watch mode (rebuild on file changes)
yarn start
```

## Development

```bash
# Run plugin in Figma
# 1. Build: yarn build
# 2. In Figma: Plugins → Development → Import plugin from manifest
# 3. Select packages/bridge/manifest.json

# Preview in browser (for UI development)
yarn build:preview
yarn preview:browser
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ENVIRONMENT` | `development`, `alpha`, `beta`, or `production` | No (default: development) |
| `MIXPANEL_ACCESS_TOKEN` | Analytics | No |
| `LICENSE_API_URL` | License validation endpoint | No (default: https://licence.tokens.studio) |
| `SENTRY_DSN` | Error tracking (alpha/beta/production only) | No |
| `SENTRY_ORG` | Sentry org (for source maps) | No |
| `SENTRY_PROJECT` | Sentry project | No |
| `SENTRY_AUTH_TOKEN` | Sentry auth (for releases) | No |
| `SENTRY_SAMPLING` | Trace sample rate (0–1) | No |
| `SENTRY_PROFILE_SAMPLING` | Profile sample rate | No |
| `SENTRY_REPLAY_SAMPLING` | Session replay rate | No |
| `FIGMA_ID_HASH_SECRET` | Hash secret for Figma IDs | No |
| `SUPABASE_URL` | Supabase instance URL | No |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | No |
| `TOKEN_FLOW_APP_URL` | Token Flow app URL | No |
| `SECOND_SCREEN_APP_URL` | Second screen app URL | No |
| `TOKENS_STUDIO_API_HOST` | Tokens Studio API host | No |

Create a `.env` file (see `.env.example`) and set values as needed. Never commit `.env` with secrets.

## Scripts

| Script | Description |
|--------|-------------|
| `yarn build` | Production build |
| `yarn build:dev` | Development build |
| `yarn start` | Watch mode |
| `yarn test` | Run tests |
| `yarn lint` | Lint and fix |
| `yarn serve` | Serve dist on port 58630 |

## Documentation

- [FIGMA_API_CROSSCHECK.md](./FIGMA_API_CROSSCHECK.md) – Figma API compliance and migration notes. Update when APIs change.
