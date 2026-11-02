# 46Spaces

React (Vite) frontend and Node.js (Express) API for the 46Spaces website.

## Project structure

<<<<<<< HEAD
- `client/` — React website, blog pages and admin dashboard
- `server/` — Express API, authentication and JSON-backed content storage
- `server/data/` — Runtime data files for blogs, settings and enquiries (not committed)
=======
- `client/` — React app (site UI, forms, animations)
- `server/` — Express API that stores enquiries in `server/data/enquiries.json`
>>>>>>> a2c25c8ff7d08cfe2bb5612765c4b2f0300f6134

## Local setup

```bash
npm install
npm run install:all
npm run dev
```

<<<<<<< HEAD
- Website: http://localhost:5173
- API: http://localhost:5000
- Admin: http://localhost:5173/admin

Default local admin credentials:

- Username: `Admin`
- Password: `Admin@123#`

The admin panel supports blog creation, editing, publishing and deletion; homepage blog display settings; site/contact/social settings; SEO defaults; and enquiry viewing. Published blog pages use `/blog/:slug`.

## Production

Set these environment variables before starting the server:

```bash
NODE_ENV=production
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=use-a-strong-unique-password
ADMIN_SESSION_SECRET=use-a-long-random-secret
```

Then run:

=======
- Site: http://localhost:5173
- API: http://localhost:5000

Form submissions from the site are proxied to `POST /api/enquiries`.

## Production

>>>>>>> a2c25c8ff7d08cfe2bb5612765c4b2f0300f6134
```bash
npm start
```

<<<<<<< HEAD
The Express server serves the built frontend and API on the same origin. Keep `server/data/` on persistent storage in production; it contains the blog posts, settings and enquiries. The local default password is intentionally disabled in production unless `ADMIN_PASSWORD` is explicitly configured.
=======
This builds the React app and serves it from the Express server on port 5000.
>>>>>>> a2c25c8ff7d08cfe2bb5612765c4b2f0300f6134
