# Payal Decor ERP — React Router DOM migration

The frontend has been changed from TanStack Start / TanStack Router to a standard Vite + React + React Router DOM single-page application. Existing route page JSX, styles, UI components, React Query, i18n, auth helper, backend folder, Prisma schema, and backend migrations have been retained.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The production output is `dist/`. The Netlify configuration publishes `dist` and rewrites unknown paths to `/index.html`. `public/.htaccess` is included for Apache hosting and is copied into `dist/` by Vite.

## Routing

Routes are centralized in `src/App.tsx`. Admin pages use nested routing with `Outlet`. `RequireAuth` protects ERP pages and sends unauthenticated visitors to `/login`; authenticated visitors are redirected away from the login page.

## Backend

The `backend/` directory and its Express/Prisma implementation were not rewritten. Keep backend environment variables and deployment settings configured separately.

## Important

The original root `package-lock.json` belonged to the TanStack Start dependency tree, so it was removed rather than shipping a misleading lockfile. Run `npm install` once after extracting this project to generate a fresh lockfile for the React Router DOM dependencies; the Netlify deployment command already uses `npm install`.
