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

2. Create `server/.env` by copying `server/.env.example`. Set a working PostgreSQL `DATABASE_URL`, a unique `ADMIN_PASSWORD`, and a long random `ADMIN_SESSION_SECRET`.

3. Generate Prisma Client and apply the database migration:

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

On a brand-new database, the first admin account is created using `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `server/.env`. If an admin already exists in the database, changing those environment variables does not reset its password; use the admin password-change screen instead.

## CMS features

- Dashboard, blog management and enquiry inbox
- Project CRUD with draft/published lifecycle, category, location, cover image and project details
- Header and footer menus, including nested child items
- Dynamic form definitions for contact, landowner and channel-partner forms
- Logo and favicon uploads, site/contact/social/SEO settings
- Admin name, email and profile picture; password change
- Media uploads stored under `client/public/uploads`

Menus and form schemas are editable as JSON in the admin area. Menu items use `{ "id", "label", "url", "children": [] }`. Form fields use `{ "name", "label", "type", "required", "options": [] }`.

## Production deployment

Set these environment variables for the Express server:

```bash
NODE_ENV=production
DATABASE_URL=your-postgresql-connection-string
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=a-strong-initial-password
ADMIN_SESSION_SECRET=a-long-random-secret
CLIENT_ORIGIN=https://your-website-domain.com
```

Apply migrations and build the frontend:

```bash
npm run db:deploy --prefix server
npm run build
npm start --prefix server
```

Use persistent storage for PostgreSQL data and uploaded files. Do not rely on an ephemeral serverless filesystem for CMS uploads. If the frontend is deployed separately, route `/api/*` and `/uploads/*` to the Express API host and configure the API origin accordingly.
