# AGENTS.md

Instructions for coding agents working in this repository.

## Project Overview

- This is a Nuxt 4 + Vue 3 + TypeScript app for the OWN x BORDEL Mortgage UI.
- The frontend is client-rendered (`ssr: false` in `nuxt.config.ts`), but the repo also contains Nitro server routes for the conference voucher flow under `server/api/voucher`.
- The stack includes Bun, Tailwind CSS v4, shadcn-nuxt/Reka UI, Pinia, Vue Query, Wagmi, viem, and Reown AppKit.
- Production voucher support depends on server routes and Cloudflare D1 storage.

## Research And Docs

- Use Context7 MCP whenever the task involves a library, framework, SDK, API, CLI tool, or cloud service.
- Resolve the library ID first, then query docs with the full task/question.
- Prefer Context7 over memory for Nuxt, Vue, Wagmi, viem, Tailwind, shadcn-vue, Cloudflare, SIWE, and related tooling.

## Working Rules

- Read the relevant files before editing. This repo has active in-progress work; do not overwrite unrelated user changes.
- Prefer narrow, surgical edits over repo-wide rewrites.
- Prefer `bun` for package and script commands.
- Preserve the existing branded visual language unless the user asks for a redesign. The current UI uses custom fonts, dark surfaces, and green accent styling.

## Commands

- Install dependencies: `bun install`
- Start dev server: `bun run dev`
- Preview production build locally: `bun run preview`
- Static generate: `bun run generate`
- Cloudflare Pages static preset: `bun run generate-cf-pages`
- Lint: `bun run lint`
- Auto-fix lint: `bun run lint:fix`

Notes:

- The Nuxt dev server runs on port `8000`.
- ESLint imports `.nuxt/eslint.config.mjs`, so if `.nuxt` is missing run `bun install` or `bun run postinstall` before linting.
- `README.md` currently mentions `build-cf-pages`, but `package.json` exposes `generate-cf-pages`. Verify deployment intent before editing deployment docs or scripts.

## Repo Map

- `app/pages`: route-level Vue pages
- `app/layouts`: layouts
- `app/components`: app-specific UI components
- `app/components/ui`: shadcn/Reka UI primitives
- `app/components/boxes`, `app/components/modals`, `app/components/icons`: grouped UI areas
- `app/composables`: loan, wallet, voucher, and data-fetching logic
- `app/constants`: addresses, proposal constants, domains, links, mutation IDs
- `app/config/appkit.ts`: Reown AppKit + Wagmi setup
- `app/lib`: shared client utilities
- `app/plugins`: Nuxt plugins for Vue Query, Wagmi, toastification, Clarity
- `server/api/voucher`: conference voucher API endpoints
- `server/utils/voucher`: D1 access, SIWE auth, cookies, security, rate limiting
- `database`: D1 schema and seed example files
- `public`: fonts, icons, images, and static assets

## Code Conventions

- Prefer `<script setup lang="ts">` and the Composition API.
- Respect Nuxt auto-imports. Components are auto-registered from `app/components`, `app/components/ui`, `app/components/boxes`, `app/components/modals`, and `app/components/icons` with `pathPrefix: false`.
- Prefer `~/` and `@/` aliases over deep relative imports.
- Use the existing `cn()` helper from `app/lib/utils.ts` for class merging.
- Keep chain IDs, addresses, proposal parameters, and external links in `app/constants/*` instead of hardcoding them in components or composables.
- Preserve shadcn/Reka component patterns in `app/components/ui/*` instead of creating a parallel UI primitive layer.
- Keep edits consistent with existing formatting and naming patterns in surrounding files.

## Frontend Guidance

- Preserve the current high-contrast marketing style. Avoid generic restyling.
- Reuse existing CSS, icons, and fonts before adding new design primitives.
- Check responsive behavior when editing page layouts or call-to-action sections.
- Because the app is client-rendered, browser APIs are acceptable in client code when used deliberately.

## Voucher / Server Guidance

- The conference voucher flow uses server routes plus D1-backed storage.
- Keep storage availability checks in place. `DB` is the expected Cloudflare D1 binding name.
- Keep SIWE verification, session handling, and rate limiting intact when changing the voucher flow.
- Prefer explicit `createError(...)` responses with correct HTTP status codes in server handlers.
- Do not commit real wallet allowlists, voucher codes, or private seed data. Use `database/conference-voucher.seed.example.sql` as the public example only.

## Environment

- Copy `.env.example` to `.env` for local development.
- Public env vars currently used:
  - `NUXT_PUBLIC_MORALIS_API_KEY`
  - `NUXT_PUBLIC_CLARITY_ID`
- Voucher chain configuration:
  - Local env example uses `NUXT_VOUCHER_SIWE_CHAIN_ID`
  - Cloudflare deployments may expose `VOUCHER_SIWE_CHAIN_ID`

## Validation

- Run `bun run lint` after meaningful code changes.
- There is no test suite configured in this repo today. If you change behavior, include the manual validation you performed in your handoff.
