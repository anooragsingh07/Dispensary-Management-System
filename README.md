# Campus Dispensary Management System

A web portal for the campus health centre. Students can review their own medical history. Doctors and authorized dispensary staff can search student profiles and save separate clinical consultations. Administrators can manage doctor/staff accounts, medicine stock and public health-centre content.

## Features

- Student and staff sign-in and student self-registration.
- Administrator setup through a one-time seed command; public sign-up cannot create staff or administrator accounts.
- Student profiles with unique roll numbers, and consultation history linked to student IDs.
- Consultation records for complaints, symptoms, vitals, assessment, prescriptions, advice, precautions, follow-up and private clinical notes.
- Prescription items linked to their consultation; selected stock items are reserved atomically when a dispense quantity is entered.
- Student medical history is scoped to the signed-in student's profile. Private clinical notes are visible only to authorized clinical staff.
- Medicine search and public stock view.
- Staff directory, facility and hospital listings, notices, and photo gallery.
- Role-checked administrator, doctor, authorized staff and student APIs backed by Express and MongoDB.

## Medical-record data model

The project uses MongoDB, so the requested relational tables are implemented as collections:

- `students`: the profile and unique roll number.
- `users`: login identity, hashed password, role and `studentId` link for student accounts.
- `consultations`: one document per visit, linked with `studentId` and `doctorId`.
- `prescriptions`: medicine instructions linked to `consultationId`, optionally linked to a stock `medicineId`.
- `audit_logs`: consultation creation/update actor, record IDs and changed field names. Clinical field values are not copied into audit entries.

MongoDB schema validation, unique indexes, and Mongoose validators enforce the application constraints. `clinicalNotes` is excluded by default and the student history endpoint explicitly removes it before responding.

## Run locally

### Requirements

- Node.js 20.13 or newer and npm.
- A MongoDB database, either local or hosted.
- Cloudinary unsigned upload settings for gallery uploads (optional).

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

### Migrate an existing database

Back up the database first. Existing installations may have student profile fields embedded in `users` and visits in the older visit-history collection. After setting the same `MONGO_URI` in `backend/.env`, run this one-time, repeat-safe migration before relying on existing student logins or visits:

```powershell
cd backend
npm run db:migrate:medical
```

It creates or links `students`, moves existing profile fields out of student login documents, converts each legacy history entry to a consultation and prescription items, and removes the obsolete `users.roll` index. It does not remove legacy history documents or adjust stock for already-dispensed medicines. Inspect the migration summary and application data after running it.

`npm run seed:demo` creates demonstration accounts and sample student visits, then links those sample visits to the new medical-record collections. Demo credentials must be set in the local `.env` and are never committed.

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
- Set `VITE_API_BASE_URL` to the public API origin when the website and API use different hosts, then rebuild the frontend.
- Configure a Cloudinary unsigned upload preset and provide its name and cloud name to the frontend. The API accepts only HTTPS image links.

Keep real `.env` files and credentials out of Git. The repository ignores local environment files and dependency folders.

## Workflow and permissions

1. An administrator creates a doctor account from staff management by choosing the Doctor role. Authorized staff and administrators can also register/search student profiles.
2. From the student profile, clinical staff choose **New consultation**, enter the visit and assessment, add prescription instructions, and save. Each save creates a separate consultation; it does not replace earlier visits.
3. A signed-in student sees only the profile linked to their account and their consultations, in chronological order. Student-facing APIs omit `clinicalNotes`. Administrators, doctors and authorized dispensary staff can view private notes from clinical record screens.

The doctor/staff dashboard routes require an authenticated role. Doctors can edit only consultations they created; administrators can edit any consultation; authorized staff can create and view clinical records but cannot edit them. Students cannot use clinician lookup/history endpoints, and their own history endpoint derives `studentId` from the authenticated session rather than a request parameter.

## Tests

Run the backend validation and role-guard tests with:

```powershell
cd backend
npm test
```

The end-to-end registration/search/consultation/prescription/history/RBAC test runs only when `TEST_MONGO_URI` points to a dedicated MongoDB database whose database name contains `test`. It is skipped otherwise to avoid writing test fixtures into a regular development or production database. To run it, set `TEST_MONGO_URI` in the test shell, then run `npm test`.
