# 46Spaces

React (Vite) frontend and Node.js (Express) API for the 46Spaces website.

## Project structure

- `client/` — React app (site UI, forms, animations)
- `server/` — Express API that stores enquiries in `server/data/enquiries.json`

## Local setup

```bash
npm install
npm run install:all
npm run dev
```

- Site: http://localhost:5173
- API: http://localhost:5000

Form submissions from the site are proxied to `POST /api/enquiries`.

## Production

```bash
npm start
```

This builds the React app and serves it from the Express server on port 5000.
