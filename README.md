# Campus Dispensary Management System

A web portal for the campus health centre. Students can review their own visit history. Authorized dispensary staff can manage student profiles, medicine stock and visit records. Administrators can manage staff accounts and publish notices. The public home page shows health-centre contacts, facilities, nearby hospitals and gallery images.

## Features

- Student and staff sign-in, student self-registration, and password recovery by email code.
- Administrator setup through a one-time seed command; public sign-up cannot create staff or administrator accounts.
- Student profiles, visit records, and medicine dispensing with stock checks.
- Medicine search and public stock view.
- Staff directory, facility and hospital listings, notices, and photo gallery.
- Role-checked admin and staff pages backed by an Express API and MongoDB.

## Run locally

### Requirements

- Node.js 20.13 or newer and npm.
- A MongoDB database, either local or hosted.
- Cloudinary unsigned upload settings for gallery uploads (optional).
- SMTP credentials for password-recovery and student welcome emails (optional in development; required for password recovery in production).

### Start the API

1. Open a terminal in `backend` and copy `.env.example` to `.env`.
2. Set `MONGO_URI` and replace `JWT_SECRET` with a long random value. Set `ADMIN_NAME`, `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` for the initial administrator.
3. Install dependencies and create the first administrator:

   ```powershell
   npm install
   npm run seed:admin
   ```

4. Start the API:

   ```powershell
   npm run dev
   ```

The API listens on port `4000` by default. Its health endpoint is `http://localhost:4000/api/health`.

### Start the website

1. Open a second terminal in `frontend` and copy `.env.example` to `.env.local`.
2. For local development, leave `VITE_API_BASE_URL` blank. Vite proxies `/api` requests to the API on port `4000`.
3. If you want gallery uploads, set `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`.
4. Install dependencies and start the website:

   ```powershell
   npm install
   npm run dev
   ```

Vite prints the local website URL when it starts.

## Production configuration

- Set `NODE_ENV=production`, `PORT`, `MONGO_URI`, and a unique, long `JWT_SECRET` in the API environment.
- Set `FRONTEND_ORIGINS` to the exact website origin or comma-separated origins. Do not use `*` with credentialed cookies.
- Set `COOKIE_SAME_SITE=lax` when the website and API share a site. For a genuinely cross-site deployment, use `COOKIE_SAME_SITE=none` and HTTPS.
- Set `EMAIL` and `EMAIL_PASSWORD` to enable password recovery and student welcome emails.
- Set `VITE_API_BASE_URL` to the public API origin when the website and API use different hosts, then rebuild the frontend.
- Configure a Cloudinary unsigned upload preset and provide its name and cloud name to the frontend. The API accepts only HTTPS image links.

Keep real `.env` files and credentials out of Git. The repository ignores local environment files and dependency folders.
