-- init-db.sql
-- Auto-generated schema migration derived from shared/schema.ts
-- Runs idempotent CREATE TABLE IF NOT EXISTS statements for all tables used by the app.

-- companies
CREATE TABLE IF NOT EXISTS companies (
	id serial PRIMARY KEY,
	name text NOT NULL UNIQUE,
	domain text,
	created_at timestamp DEFAULT now(),
	updated_at timestamp DEFAULT now()
);

-- users
CREATE TABLE IF NOT EXISTS users (
	id serial PRIMARY KEY,
	username text NOT NULL UNIQUE,
	password text NOT NULL,
	email text,
	company text,
	company_id integer REFERENCES companies(id),
	is_admin boolean DEFAULT false,
	role text DEFAULT 'user',
	organization_id text,
	organization_name text,
	stripe_customer_id text,
	stripe_subscription_id text,
	payment_method_id text,
	subscription_status text DEFAULT 'free',
	subscription_end_date timestamp,
	created_at timestamp DEFAULT now()
);

-- patients
CREATE TABLE IF NOT EXISTS patients (
	id serial PRIMARY KEY,
	patient_id text NOT NULL UNIQUE,
	patient_name text,
	provider_id text,
	provider_name text,
	provider_lname text,
	user_id integer REFERENCES users(id),
	age_range text,
	date_of_birth date,
	gender text,
	race text,
	ethnicity text,
	zip_code text,
	financial_status text,
	financial_strain text,
	housing_insecurity text,
	food_insecurity text,
	veteran_status text,
	education_level text,
	access_to_transportation text,
	has_a_car text,
	diagnosis1 text,
	diagnosis2 text,
	diagnosis3 text,
	additional_fields json
);

-- notes
CREATE TABLE IF NOT EXISTS notes (
	id serial PRIMARY KEY,
	patient_id text NOT NULL,
	dos_date date NOT NULL,
	note_text text NOT NULL,
	provider_id text,
	user_id integer REFERENCES users(id)
);

-- symptom_master
CREATE TABLE IF NOT EXISTS symptom_master (
	id serial PRIMARY KEY,
	symptom_id text NOT NULL,
	symptom_segment text NOT NULL,
	diagnosis text,
	diagnosis_icd10_code text,
	diagnostic_category text,
	symp_prob text,
	z_code_hrsn text,
	hrsn_category text
);

-- extracted_symptoms
CREATE TABLE IF NOT EXISTS extracted_symptoms (
	id serial PRIMARY KEY,
	mention_id text NOT NULL UNIQUE,
	patient_id text NOT NULL,
	patient_name text,
	provider_id text,
	provider_name text,
	dos_date date NOT NULL,
	symptom_segment text NOT NULL,
	symptom_id text,
	diagnosis text,
	diagnosis_icd10_code text,
	diagnostic_category text,
	symp_prob text,
	zcode_hrsn text,
	symptom_present text DEFAULT 'Yes',
	symptom_detected text DEFAULT 'Yes',
	validated text DEFAULT 'Yes',
	symptom_segments_in_note integer DEFAULT 1,
	position_in_text integer,
	housing_status text,
	food_status text,
	financial_status text,
	transportation_needs text,
	has_a_car text,
	utility_insecurity text,
	childcare_needs text,
	elder_care_needs text,
	employment_status text,
	education_needs text,
	legal_needs text,
	social_isolation text,
	user_id integer REFERENCES users(id),
	pre_processed boolean DEFAULT false
);

-- file_uploads
CREATE TABLE IF NOT EXISTS file_uploads (
	id serial PRIMARY KEY,
	file_name text NOT NULL,
	file_type text NOT NULL,
	upload_date timestamp DEFAULT now(),
	processed_status boolean DEFAULT false,
	record_count integer,
	patient_count integer,
	user_id integer REFERENCES users(id),
	file_hash text,
	file_size integer,
	last_modified timestamp,
	processing_time integer
);

-- payments
CREATE TABLE IF NOT EXISTS payments (
	id serial PRIMARY KEY,
	user_id integer NOT NULL REFERENCES users(id),
	amount integer NOT NULL,
	currency text DEFAULT 'usd',
	payment_type text NOT NULL,
	search_type text,
	patient_count integer,
	status text NOT NULL,
	stripe_payment_intent_id text,
	stripe_invoice_id text,
	metadata json,
	created_at timestamp DEFAULT now(),
	updated_at timestamp DEFAULT now()
);

-- receipt_items
CREATE TABLE IF NOT EXISTS receipt_items (
	id serial PRIMARY KEY,
	receipt_id integer NOT NULL,
	description text NOT NULL,
	amount integer NOT NULL,
	quantity integer DEFAULT 1,
	unit_price integer NOT NULL,
	item_type text NOT NULL,
	metadata json,
	created_at timestamp DEFAULT now()
);

-- receipts
CREATE TABLE IF NOT EXISTS receipts (
	id serial PRIMARY KEY,
	payment_id integer REFERENCES payments(id),
	user_id integer NOT NULL REFERENCES users(id),
	receipt_number text NOT NULL UNIQUE,
	receipt_date timestamp DEFAULT now(),
	amount integer NOT NULL,
	description text NOT NULL,
	item_count integer DEFAULT 1,
	tax integer DEFAULT 0,
	pdf_url text,
	previous_balance integer DEFAULT 0,
	payments_received integer DEFAULT 0,
	total_due integer,
	company_name text DEFAULT 'Behavioral Health Analytics',
	company_tax_id text DEFAULT '83-1234567',
	company_address text DEFAULT '123 Healthcare Avenue, Suite 400, San Francisco, CA 94103',
	company_phone text DEFAULT '(415) 555-9876',
	company_email text DEFAULT 'billing@bh-analytics.com',
	customer_name text,
	customer_email text,
	status text DEFAULT 'pending',
	due_date timestamp,
	payment_terms text DEFAULT 'Due on Receipt',
	payment_method text,
	notes text,
	created_at timestamp DEFAULT now(),
	updated_at timestamp DEFAULT now()
);

-- processing_status
CREATE TABLE IF NOT EXISTS processing_status (
	id serial PRIMARY KEY,
	user_id integer NOT NULL REFERENCES users(id),
	process_type varchar(50) NOT NULL,
	status varchar(20) NOT NULL,
	progress integer DEFAULT 0,
	current_stage varchar(50),
	message text,
	total_items integer,
	processed_items integer DEFAULT 0,
	start_time timestamp DEFAULT now(),
	last_update_time timestamp DEFAULT now(),
	end_time timestamp,
	error text
);

-- symptom_segments
CREATE TABLE IF NOT EXISTS symptom_segments (
	id serial PRIMARY KEY,
	patient_id text NOT NULL,
	symptom_id text NOT NULL,
	symptom_segment text NOT NULL,
	note_date date NOT NULL,
	diagnosis text,
	diagnosis_icd10_code text,
	diagnostic_category text,
	symp_prob text,
	zcode_hrsn text,
	created_at timestamp DEFAULT now()
);

-- notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
	id serial PRIMARY KEY,
	user_id integer NOT NULL REFERENCES users(id),
	email_enabled boolean DEFAULT true,
	upload_notifications boolean DEFAULT true,
	processing_notifications boolean DEFAULT true,
	created_at timestamp DEFAULT now(),
	updated_at timestamp DEFAULT now()
);

-- process_logs
CREATE TABLE IF NOT EXISTS process_logs (
	id serial PRIMARY KEY,
	user_id integer NOT NULL REFERENCES users(id),
	category varchar(50) NOT NULL,
	process_type varchar(100),
	file_name text,
	file_size integer,
	file_type varchar(20),
	outcome varchar(20) NOT NULL,
	processing_time_ms integer,
	processing_stage varchar(100),
	reason_for_failure text,
	corrective_actions text,
	expected_records integer,
	actual_records integer,
	patients_expected integer,
	patients_actual integer,
	notes_expected integer,
	notes_actual integer,
	validation_errors integer DEFAULT 0,
	duplicates_found integer DEFAULT 0,
	memory_usage_mb integer,
	cpu_usage_percent integer,
	database_query_time_ms integer,
	retry_attempts integer DEFAULT 0,
	client_info json,
	network_metrics json,
	system_load json,
	verification_results json,
	email_notification_sent boolean DEFAULT false,
	email_sent_time timestamp,
	email_recipient text,
	email_type varchar(50),
	email_delivery_status varchar(20),
	additional_metadata json,
	start_time timestamp NOT NULL,
	end_time timestamp,
	created_at timestamp DEFAULT now()
);

	-- Ensure critical schema changes are present (idempotent)
	-- This helps when a table was created earlier without newer columns.
	ALTER TABLE processing_status ADD COLUMN IF NOT EXISTS message text;

	-- Ensure other columns exist to match application expectations
	ALTER TABLE processing_status ADD COLUMN IF NOT EXISTS current_stage varchar(50);
	ALTER TABLE processing_status ADD COLUMN IF NOT EXISTS total_items integer;
	ALTER TABLE processing_status ADD COLUMN IF NOT EXISTS processed_items integer DEFAULT 0;
	ALTER TABLE processing_status ADD COLUMN IF NOT EXISTS last_update_time timestamp DEFAULT now();
	ALTER TABLE processing_status ADD COLUMN IF NOT EXISTS end_time timestamp;
	ALTER TABLE processing_status ADD COLUMN IF NOT EXISTS error text;

	-- Ensure a unique constraint/index exists for upsert on (user_id, process_type)
	DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM pg_indexes WHERE tablename = 'processing_status' AND indexname = 'processing_status_user_type_idx'
		) THEN
			CREATE UNIQUE INDEX processing_status_user_type_idx ON processing_status (user_id, process_type);
		END IF;
	END$$;

	-- Create unique index for extracted_symptoms to prevent conflicts
	CREATE UNIQUE INDEX IF NOT EXISTS ux_extracted_symptoms_conflict ON extracted_symptoms (patient_id, symptom_segment, dos_date, position_in_text, user_id);

	-- End of init-db.sql

