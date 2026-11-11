# 46Spaces Website + CMS

React 19 + Vite frontend with an Express API and a Prisma/PostgreSQL-backed admin workspace.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- PostgreSQL database

## Local setup

1. Install dependencies from the project root:

   ```bash
   npm install
   npm run install:all
   ```

2. Create `server/.env` by copying `server/.env.example`. Set a working PostgreSQL `DATABASE_URL`, a unique `ADMIN_PASSWORD`, a long random `ADMIN_SESSION_SECRET`, and `CLIENT_ORIGIN` (for example `http://localhost:5173`).

3. Generate Prisma Client and apply database migrations:

   ```bash
   npm run db:setup --prefix server
   ```

4. Start the frontend and API from the project root:

   ```bash
   npm run dev
   ```

- Website: http://localhost:5173
- API: http://localhost:5000
- Admin: http://localhost:5173/admin

On a brand-new database, the first admin account is created using `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `server/.env`. If an admin already exists, changing those environment variables does not reset its password; use the admin password-change or forgot-password flow instead.

## CMS features

- Dashboard, blog management and enquiry inbox (view/delete)
- Project CRUD with draft/published lifecycle, category, location, cover image and project details
- Visual header/footer menu builder (including nested child items)
- Visual form builder for contact, landowner and channel-partner forms
- Logo and favicon uploads, site/contact/social/SEO settings
- Admin profile: name, username, email, phone, additional contact, avatar, password change
- Forgot password / secure timed reset token
- SMTP settings with encrypted password storage and connection test
- Branded HTML email templates for enquiries, confirmations and password flows
- Media library with disk storage locally and database fallback for serverless hosts

## Production deployment (Vercel)

### Frontend (`client` / root)

- Build command: `npm run build` (from root) or `npm run build --prefix client`
- Output: `client/dist`
- Rewrites already proxy `/api/*` and `/uploads/*` to the API host and fall back to `index.html` for SPA routes

### Backend (`server`)

Deploy the `server` directory as its own Vercel project (existing host: `server-theta-nine-16.vercel.app`).

Required environment variables:

```bash
NODE_ENV=production
DATABASE_URL=your-postgresql-connection-string
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=a-strong-initial-password
ADMIN_SESSION_SECRET=a-long-random-secret
CLIENT_ORIGIN=https://your-website-domain.com
PUBLIC_BASE_URL=https://your-website-domain.com
```

Build command recommendation:

```bash
npm run build
```

(`prisma generate` + `prisma migrate deploy`)

Uploads on Vercel are persisted via the `MediaAsset` database fallback when the local filesystem is ephemeral. Prefer configuring a durable object store later for large media libraries.

### Manual Vercel checklist

1. Confirm the frontend project Root Directory (repo root or `client`) and that rewrites point at the live API host.
2. Confirm the API project Root Directory is `server`.
3. Set all production env vars above on the API project; set `CLIENT_ORIGIN` / `PUBLIC_BASE_URL` to the live website origin.
4. Redeploy both projects after pushing.
5. Sign in to `/admin`, open **Email / SMTP**, save credentials, send a test email, then enable notifications.
6. Open **Navigation menus** and confirm header links use `/#section` targets for the landing page.

## Security notes

- Admin passwords are hashed with scrypt.
- Sessions use signed HTTP-only cookies and a session version for logout invalidation.
- Mutating admin APIs require a CSRF token (`x-csrf-token`).
- SMTP passwords are encrypted at rest and never returned to the frontend.
- Do not commit `.env` files or secrets.
