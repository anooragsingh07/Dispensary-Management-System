CREATE TABLE IF NOT EXISTS students (
    id text PRIMARY KEY,
    name varchar(120) NOT NULL,
    record_type varchar(16) NOT NULL DEFAULT 'student' CHECK (record_type IN ('student', 'employee')),
    roll varchar(50) NOT NULL UNIQUE,
    employee_id varchar(50) NOT NULL DEFAULT '',
    mobile_no varchar(24) NOT NULL DEFAULT '',
    father_name varchar(120) NOT NULL DEFAULT '',
    father_mobile varchar(24) NOT NULL DEFAULT '',
    address varchar(500) NOT NULL DEFAULT '',
    previous_health varchar(2000) NOT NULL DEFAULT '',
    age integer CHECK (age IS NULL OR age BETWEEN 1 AND 130),
    blood_group varchar(3) NOT NULL DEFAULT '' CHECK (blood_group IN ('', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    name varchar(120),
    role varchar(16) NOT NULL CHECK (role IN ('admin', 'doctor', 'staff', 'student', 'employee')),
    auth_version integer NOT NULL DEFAULT 0,
    email varchar(254) NOT NULL UNIQUE,
    password varchar(255) NOT NULL,
    student_id text UNIQUE REFERENCES students(id) ON DELETE RESTRICT,
    designation varchar(120) NOT NULL DEFAULT '',
    mobile_no varchar(24) NOT NULL DEFAULT '',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_role_name_idx ON users(role, name);

CREATE TABLE IF NOT EXISTS medicines (
    id text PRIMARY KEY,
    name varchar(160) NOT NULL,
    quantity numeric(14, 3) NOT NULL CHECK (quantity >= 0),
    usage varchar(1000) NOT NULL,
    added_by text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS medicines_name_idx ON medicines(name);

CREATE TABLE IF NOT EXISTS histories (
    id text PRIMARY KEY,
    roll varchar(50) NOT NULL,
    student text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    symptoms varchar(1000) NOT NULL DEFAULT '',
    medicines jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS histories_student_date_idx ON histories(student, created_at DESC);
CREATE INDEX IF NOT EXISTS histories_roll_date_idx ON histories(roll, created_at DESC);

CREATE TABLE IF NOT EXISTS consultations (
    id text PRIMARY KEY,
    student_id text NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    doctor_id text REFERENCES users(id) ON DELETE SET NULL,
    visit_at timestamptz NOT NULL DEFAULT now(),
    chief_complaint varchar(500) NOT NULL DEFAULT '',
    symptoms varchar(2000) NOT NULL DEFAULT '',
    vitals jsonb NOT NULL DEFAULT '{}'::jsonb,
    diagnosis varchar(2000) NOT NULL DEFAULT '',
    doctor_advice varchar(2000) NOT NULL DEFAULT '',
    precautions varchar(2000) NOT NULL DEFAULT '',
    follow_up_at timestamptz,
    idempotency_key varchar(80),
    clinical_notes varchar(4000) NOT NULL DEFAULT '',
    legacy_history_id text UNIQUE REFERENCES histories(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consultations_student_visit_idx ON consultations(student_id, visit_at DESC);
CREATE INDEX IF NOT EXISTS consultations_doctor_visit_idx ON consultations(doctor_id, visit_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS consultations_doctor_idempotency_idx ON consultations(doctor_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS prescriptions (
    id text PRIMARY KEY,
    consultation_id text NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    medicine_id text REFERENCES medicines(id) ON DELETE SET NULL,
    medicine_name varchar(160) NOT NULL,
    dosage varchar(200) NOT NULL DEFAULT '',
    frequency varchar(120) NOT NULL DEFAULT '',
    duration varchar(120) NOT NULL DEFAULT '',
    dispensed_quantity integer NOT NULL DEFAULT 0 CHECK (dispensed_quantity >= 0),
    legacy_history_id text REFERENCES histories(id) ON DELETE SET NULL,
    legacy_item_index integer CHECK (legacy_item_index IS NULL OR legacy_item_index >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (legacy_history_id, legacy_item_index)
);
CREATE INDEX IF NOT EXISTS prescriptions_consultation_date_idx ON prescriptions(consultation_id, created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
    id text PRIMARY KEY,
    actor_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action varchar(40) NOT NULL CHECK (action IN ('consultation.created', 'consultation.updated')),
    consultation_id text NOT NULL REFERENCES consultations(id) ON DELETE RESTRICT,
    student_id text NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    changed_fields text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_consultation_idx ON audit_logs(consultation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_student_idx ON audit_logs(student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS facilities (
    id text PRIMARY KEY,
    title varchar(120) NOT NULL,
    description varchar(2000) NOT NULL,
    added_by text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS nearby_hospitals (
    id text PRIMARY KEY,
    name varchar(160) NOT NULL,
    address varchar(500) NOT NULL,
    contact varchar(80) NOT NULL,
    added_by text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
    id text PRIMARY KEY,
    title varchar(400) NOT NULL,
    added_by text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS galleries (
    id text PRIMARY KEY,
    link varchar(2048) NOT NULL,
    added_by text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
