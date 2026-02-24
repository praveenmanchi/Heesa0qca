# The Bridge

A Figma plugin for defining, managing, and applying design tokens — including properties Figma doesn't natively support like `borderRadius`, `spacing`, and more. Think of it as **Styles for everything**.

## Features

- **Design Tokens as JSON** — colors, typography, spacing, border radius, sizing, and more
- **Token Aliases & References** — reuse decisions across your design system
- **Theme Sets** — manage multiple themes/brands from the same token set
- **Figma Variables API** — create and manage Figma Variables
- **Sync Providers** — GitHub, GitLab, Azure DevOps, Bitbucket, JSONBin, Supernova, Tokens Studio
- **Code Generation** — codegen support for Dev Mode
- **Internationalization** — multi-language support via i18next

## Architecture

### Monorepo Structure
- **Build System:** Turbo + Yarn workspaces
- **Main Plugin:** `packages/tokens-studio-for-figma/`

### Dual-Thread Plugin Model

| Thread | Entry Point | Purpose |
|--------|------------|---------|
| **Main (Plugin Controller)** | `src/plugin/controller.ts` | Figma API interactions, lifecycle, async message handlers |
| **UI (React App)** | `src/app/index.tsx` | React-based user interface |

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/app/` | React UI — components, pages, forms |
| `src/plugin/` | Plugin-side code (Figma sandbox) |
| `src/storage/` | Token sync providers |
| `src/selectors/` | Redux state selectors |
| `src/utils/` | Shared utilities, token resolution |
| `src/types/` | TypeScript type definitions |
| `src/constants/` | App constants and enums |
| `src/figmaStorage/` | Figma plugin data storage |
| `src/i18n/` | Internationalization |
| `src/hooks/` | Custom React hooks |
| `src/icons/` | SVG icon components |

### Tech Stack

| Area | Technology |
|------|-----------|
| UI Framework | React 18 |
| State Management | Redux + Rematch |
| Styling | Stitches (CSS-in-JS) |
| Animation | Framer Motion |
| UI Components | Radix UI, @tokens-studio/ui, Figma Plugin DS |
| Code Editor | Monaco Editor |
| Git Integration | Octokit, Gitbeaker, azure-devops-node-api |
| Testing | Jest, Cypress, Testing Library |
| Bundler | Webpack 5 + SWC |

## Getting Started

```bash
# Install dependencies
yarn install

# Start development mode (webpack watch)
yarn start

# In Figma: Plugins → Development → Import plugin from manifest...
# Select: packages/tokens-studio-for-figma/manifest.json
```

## Available Commands

### Root (Monorepo)
| Command | Description |
|---------|-------------|
| `yarn build` | Build all packages |
| `yarn start` | Start dev mode |
| `yarn lint` | Run ESLint |
| `yarn test` | Run tests |

### Plugin (`packages/tokens-studio-for-figma/`)
| Command | Description |
|---------|-------------|
| `yarn build` | Production build |
| `yarn build:dev` | Development build |
| `yarn start` | Dev mode with watch |
| `yarn test` | Run Jest tests |
| `yarn test:coverage` | Tests with coverage |
| `yarn lint` | ESLint with auto-fix |
| `yarn storybook` | Start Storybook |
| `yarn cy:open` | Open Cypress E2E tests |

## License

MIT License — see [LICENSE.md](./LICENSE.md)
