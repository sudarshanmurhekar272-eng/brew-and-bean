# Brew & Bean

A premium café web experience for exploring the menu, customizing coffee, ordering ahead, and booking a table.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/brew-and-bean/src/App.tsx` — customer-facing Brew & Bean experience and local UI state.
- `artifacts/brew-and-bean/src/index.css` — café theme tokens, responsive styling, motion, and product art.
- `artifacts/brew-and-bean/index.html` — SEO metadata and local café structured data.
- `artifacts/brew-and-bean/attached_assets/generated_images/cafe-hero.jpg` — hero photography asset.

## Architecture decisions

- The first release is intentionally frontend-first and self-contained, with local state for the menu, favorites, customization, cart, theme, newsletter, reviews, FAQ, and booking flow.
- The visual direction uses generated hero photography plus CSS-rendered product art so the experience stays fast and easy to iterate without a heavyweight 3D runtime.
- The artifact runs at the root preview path so the café website is the default project surface.

## Product

- Cinematic café landing page with responsive navigation and scroll-linked sections.
- Interactive menu with category filters and search.
- Product customization for size and milk, favorites, add-to-order, cart quantity controls, and checkout confirmation.
- Table booking modal with party-size selection and confirmation state.
- Dark/light café theme toggle, newsletter signup, review carousel, FAQ accordion, events, rewards, location, and contact surfaces.

## User preferences

_No project-specific preferences recorded._

## Gotchas

- The Vite build expects `PORT` and `BASE_PATH`; the managed artifact workflow supplies both automatically.
- Keep new image assets inside the artifact package or import them from a workspace-safe path so Vite bundles them.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
