# Label Generator Application

## Overview

This is a label generator web application that allows users to create printable equipment and cable labels with QR codes and barcodes. The app appears to be designed for Danish-speaking users (form labels are in Danish). It's built as a full-stack TypeScript application with a React frontend and Express backend, following a monorepo structure with shared schema definitions.

The main feature is a label generator page (`/`) that supports two modes: equipment labels and cable labels, with configurable dimensions, QR codes, and barcodes. Labels can be printed directly from the browser.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Directory Structure
- `client/` — React frontend (Vite-powered SPA)
- `server/` — Express backend API server
- `shared/` — Shared TypeScript types and database schema (used by both client and server)
- `migrations/` — Drizzle database migration files
- `script/` — Build scripts

### Frontend Architecture
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Uses `wouter` (lightweight client-side router)
- **State Management**: TanStack React Query for server state; React hooks for local state
- **UI Components**: shadcn/ui component library (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming, using `@tailwindcss/vite` plugin
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`
- **Key Libraries**: `react-qr-code` for QR codes, `react-barcode` for barcodes, `pdfjs-dist` for PDF parsing
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework**: Express.js running on Node.js with TypeScript (compiled via `tsx`)
- **HTTP Server**: Node's built-in `createServer` wrapping Express
- **API Pattern**: RESTful routes prefixed with `/api` (defined in `server/routes.ts`)
- **Storage Layer**: Abstracted via `IStorage` interface in `server/storage.ts`. Currently uses in-memory storage (`MemStorage`), but the interface makes it easy to swap in a database-backed implementation.
- **Dev Server**: Vite dev server integrated as Express middleware in development mode (`server/vite.ts`)
- **Production**: Static files served from `dist/public` after build

### Data Storage
- **Schema**: Defined using Drizzle ORM in `shared/schema.ts` with PostgreSQL dialect
- **Current Tables**: `users` table with id (UUID), username, and password fields
- **Validation**: Zod schemas generated from Drizzle schema via `drizzle-zod`
- **Database**: PostgreSQL (configured via `DATABASE_URL` environment variable)
- **Migrations**: Managed via `drizzle-kit push` command
- **Note**: The current runtime storage is in-memory (`MemStorage`). The Drizzle schema exists but a database-backed storage implementation hasn't been wired up yet. When adding database features, implement the `IStorage` interface with Drizzle queries.

### Build System
- **Client**: Vite builds to `dist/public`
- **Server**: esbuild bundles server code to `dist/index.cjs` (CommonJS format for production)
- **Build script**: `script/build.ts` handles both client and server builds, selectively bundling certain dependencies to reduce cold start times

### Key Design Decisions
1. **Shared schema between client and server** — The `shared/` directory contains Drizzle schema definitions that generate both TypeScript types and Zod validation schemas, ensuring type safety across the stack.
2. **Storage interface abstraction** — The `IStorage` interface in `server/storage.ts` decouples business logic from storage implementation, making it straightforward to switch from in-memory to PostgreSQL.
3. **Vite middleware in development** — In dev mode, Vite runs as Express middleware with HMR, providing fast refresh without a separate dev server process.
4. **shadcn/ui components** — UI components are copied into the project (not imported from a package), allowing full customization. They live in `client/src/components/ui/`.

## External Dependencies

### Database
- **PostgreSQL** — Connected via `DATABASE_URL` environment variable. Uses Drizzle ORM for schema management and queries. Session storage can use `connect-pg-simple`.

### Key NPM Packages
- **Drizzle ORM + drizzle-kit** — Database ORM and migration tooling
- **Express** — HTTP server framework
- **TanStack React Query** — Async data fetching and caching
- **Radix UI** — Accessible, unstyled UI primitives (used by shadcn/ui)
- **react-qr-code** — QR code generation for labels
- **react-barcode** — Barcode generation for labels
- **pdfjs-dist** — PDF parsing (loaded via CDN worker)
- **Zod** — Runtime type validation
- **react-hook-form** — Form state management
- **wouter** — Client-side routing

### Replit-specific
- `@replit/vite-plugin-runtime-error-modal` — Runtime error overlay in development
- `@replit/vite-plugin-cartographer` — Dev tooling (dev only)
- `@replit/vite-plugin-dev-banner` — Dev banner (dev only)
- Custom `vite-plugin-meta-images` — Updates OpenGraph meta tags with Replit deployment URLs