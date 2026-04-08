# OWN x BORDEL Mortgage UI

Frontend application for the OWN x BORDEL Mortgage platform, built with [Nuxt 4](https://nuxt.com).

## 🛠️ Tech Stack

- **Framework:** [Nuxt 4](https://nuxt.com)
- **UI Library:** [Shadcn Vue](https://www.shadcn-vue.com)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com)
- **State Management:** [Pinia](https://pinia.vuejs.org)
- **Web3:** [Wagmi](https://wagmi.sh) & [AppKit](https://reown.com/appkit)
- **Package Manager:** [Bun](https://bun.sh)

## 🚀 Setup

1) Copy `.env.example` to `.env` and fill in the required values.

2) Install dependencies with `bun install`.

## 💻 Development Server

Start the development server on `http://localhost:8000`:

```bash
bun run dev
```

## 🏗️ Preview Local Production Build

Builds the production app and opens the preview server on `http://localhost:3000`:

```bash
bun run preview
```

### Cloudflare Pages

This project now relies on Nuxt server routes for the conference voucher claim flow, so the production deployment must use a Nitro server build instead of static generation.

Recommended Cloudflare Pages build command:

```bash
bun run build-cf-pages
```

Cloudflare bindings required for the voucher feature:

- D1 binding named `DB`
- environment variable `VOUCHER_SIWE_CHAIN_ID` if you need a chain other than mainnet (default: `1`)

The conference voucher schema is in [database/conference-voucher.schema.sql](/home/microhoffman/pwn/own-mortgage-ui/database/conference-voucher.schema.sql). Seed production with a private SQL file derived from [database/conference-voucher.seed.example.sql](/home/microhoffman/pwn/own-mortgage-ui/database/conference-voucher.seed.example.sql), but do not commit real addresses or voucher codes.

## Linting

```bash
# Run ESLint
bun run lint

# Fix linting errors
bun run lint:fix
```

## 📁 Project Structure

- `app/components` - Vue components (auto-imported)
- `app/layouts` - Page layouts
- `app/pages` - Application routes
- `app/composables` - Auto-imported composables
- `app/utils` - Utility functions
- `server/` - Server-side API routes
- `database/` - D1 schema and seed examples for the conference voucher feature
