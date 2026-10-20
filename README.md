# Campus Care — CGC Landran Dispensary

Campus Care is a web portal for the college health centre. Students and employees see their own profile and visit history. Doctors and authorized dispensary staff can search patients, record consultations and manage medicine stock. Administrators manage staff and public health-centre content.

## Stack

- Frontend: React 19, Vite, React Router, Axios and the existing CSS design system.
- API: Node.js 20.13+, Express 5, JWT in HTTP-only cookies and bcrypt password hashing.
- Database: PostgreSQL with the `pg` driver. Foreign keys connect patients, accounts, consultations, prescriptions, inventory and audit records.
- Local database: Docker Compose with PostgreSQL 16 and a persistent named volume.

## Features

- Combined sign-in and account creation for students and college employees.
- Unique student roll numbers and employee IDs. Staff/admin accounts are provisioned by an administrator.
- Patient search/profile workflow, separate consultation records, measured vitals, assessment, prescription, advice, precautions, follow-up and private clinical notes.
- Student/employee history scoped to the signed-in patient; private clinical notes are excluded from patient responses.
- Stock reservation and consultation/prescription/audit writes occur within a PostgreSQL transaction. If a save fails or stock is insufficient, the transaction rolls back.
- Medicine inventory, dispensary team, facilities, nearby hospitals, notices and gallery management.

## Local setup with Docker

1. If there is no root `.env` yet, copy `.env.example` to `.env`; set a strong local `POSTGRES_PASSWORD`. Preserve any existing `.env` file.
2. Start PostgreSQL from the repository root:

   ```powershell
   docker compose up -d postgres
   ```

3. If there is no `backend/.env` yet, copy `backend/.env.example` to `backend/.env`. Otherwise edit the existing ignored file and add `DATABASE_URL` using the same database, user and password from the root `.env`; keep any source `MONGO_MIGRATION_URI` there only if importing old data. Set a long random `JWT_SECRET`, `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters). Do not overwrite an existing `.env` containing the Mongo source URI.
4. Initialize the schema and first administrator:

   ```powershell
   cd backend
   npm install
   npm run db:migrate
   npm run seed:admin
   npm run dev
   ```

5. In another terminal, copy `frontend/.env.example` to `frontend/.env.local`, install packages and start Vite:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

Vite prints the web URL; the API listens on port 4000 by default. The frontend's local Vite proxy sends `/api` requests to the API. The PostgreSQL container data persists in the `campus-care-postgres` Docker volume. Back it up before removing that volume.

### Backend environment

`backend/.env.example` documents `DATABASE_URL`, optional pool sizing and TLS configuration, JWT/session settings, frontend CORS origins, seed account values and optional Cloudinary public upload settings. The ignored `backend/.env` is the local source of actual credentials. Do not commit either actual database passwords or JWT secrets.

## Import existing MongoDB data

The API now uses PostgreSQL. Existing MongoDB records are **not** copied automatically when the app starts. Preserve a backup of the source MongoDB database and use an empty PostgreSQL target for the first import.

1. Set `DATABASE_URL` to the target PostgreSQL database in `backend/.env`.
2. Set `MONGO_MIGRATION_URI` to the source MongoDB URI in the ignored `backend/.env` (the script also accepts the old `MONGO_URI` variable). Never paste the URI into source or commit it.
3. Run:

   ```powershell
   cd backend
   npm run db:import:mongo
   ```

The importer creates the PostgreSQL schema and copies the application's users, student profiles, medicines, legacy histories, consultations, prescriptions, audit logs, facilities, nearby hospitals, notices and gallery records while preserving string IDs and timestamps where possible. It reads MongoDB without modifying it and performs PostgreSQL inserts in one transaction. Missing required relationships or unique-ID conflicts stop the import and roll back that transaction; repair source data and retry. Review the imported row counts and representative accounts/visits before switching users to the new service. The app does not dual-write between databases. Do not expose the target to live writes until the migration has been accepted.

For a new installation without old data, skip this import and use `npm run seed:admin`. `npm run seed:demo` adds clearly labelled synthetic sample records using the demo passwords from `backend/.env.example`.

## Database design

PostgreSQL tables are created by `backend/migrations/001_initial.sql`:

- `students`: one profile per student or employee, unique campus ID in `roll` and `record_type` discriminator.
- `users`: email/password hash/role and optional unique `student_id` link.
- `consultations`: one visit linked to patient and clinician, measured vitals as JSONB, optional private notes, and a clinician-scoped idempotency key.
- `prescriptions`: rows linked to a consultation and optional stock item.
- `medicines`: available stock and usage label.
- `audit_logs`: actor, consultation, patient and changed field names (not clinical values).
- `histories`: compatibility storage for older visit records, plus public content tables `facilities`, `nearby_hospitals`, `notifications` and `galleries`.

IDs use text keys so Mongo ObjectId values can be preserved during import; new rows use UUID strings. SQL foreign keys protect the links. Consultation creation/update and stock deduction run in PostgreSQL transactions. The patient history endpoint derives the profile ID from the session and never accepts another patient's ID from that endpoint.

## API and permissions

All API routes are registered in `backend/index.js`; route-level role checks are in `backend/Routes/`. Session authentication and role guards are in `backend/Authentication/auth.js`. Main groups include `/api/auth`, `/api/consultations`, `/api/medicine`, `/api/history`, `/api/facility`, `/api/hospital`, `/api/notification` and `/api/gallary`.

Public sign-up checks uniqueness but currently does not verify the campus ID against an approved CGC roster or identity provider. That institutional verification should be added before relying on public self-registration for identity proof.

## Commands

Backend: `npm run dev`, `npm start`, `npm run db:migrate`, `npm run db:import:mongo`, `npm run seed:admin`, `npm run seed:demo`, `npm test`.

Frontend: `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`.

Keep local `.env` files and real credentials out of Git. They are ignored by the repository.
