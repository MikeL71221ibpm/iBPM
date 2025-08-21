import { pgTable, text, serial, integer, boolean, timestamp, json, date, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Company schema
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  domain: text("domain"), // Email domain for auto-association
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  company: text("company"), // Keep for backward compatibility
  companyId: integer("company_id").references(() => companies.id), // New foreign key
  isAdmin: boolean("is_admin").default(false),
  role: text("role").default("user"),
  organizationId: text("organization_id"),
  organizationName: text("organization_name"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  paymentMethodId: text("payment_method_id"),
  subscriptionStatus: text("subscription_status").default("free"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Patient schema - Updated to match authentic CSV field names
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  patientId: text("patient_id").notNull().unique(),
  patientName: text("patient_name"),
  providerId: text("provider_id"),
  providerName: text("provider_name"),
  providerLname: text("provider_lname"),
  userId: integer("user_id").references(() => users.id),
  age_range: text("age_range"), // Match database column names exactly
  date_of_birth: date("date_of_birth"), // Optional: if provided, age_range will be calculated
  gender: text("gender"),
  race: text("race"),
  ethnicity: text("ethnicity"),
  zip_code: text("zip_code"),
  financial_status: text("financial_status"), // Demographic: income level (high/medium/low)
  financial_strain: text("financial_strain"), // HRSN: current financial stress affecting health
  housing_insecurity: text("housing_insecurity"),
  food_insecurity: text("food_insecurity"),
  veteran_status: text("veteran_status"),
  education_level: text("education_level"),
  access_to_transportation: text("access_to_transportation"),
  has_a_car: text("has_a_car"),
  // Diagnosis fields - added per customer request (these come from upload file)
  diagnosis1: text("diagnosis1"),
  diagnosis2: text("diagnosis2"),
  diagnosis3: text("diagnosis3"),
  // Dynamic field preservation for custom HRSN indicators
  additional_fields: json("additional_fields"), // Store any unmapped customer fields
});

// Notes schema
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.patientId),
  dosDate: date("dos_date").notNull(),
  noteText: text("note_text").notNull(),
  providerId: text("provider_id"),
  userId: integer("user_id").references(() => users.id),
  // We're removing the comment field as it doesn't exist in the database
});

// Symptom master schema
export const symptomMaster = pgTable("symptom_master", {
  id: serial("id").primaryKey(),
  symptom_id: text("symptom_id").notNull(),
  symptom_segment: text("symptom_segment").notNull(),
  diagnosis: text("diagnosis"),
  diagnosis_icd10_code: text("diagnosis_icd10_code"),
  diagnostic_category: text("diagnostic_category"),
  // Column exists in symptom_master as z_code_hrsn
  symp_prob: text("symp_prob"),
  zcode_hrsn: text("z_code_hrsn"),
  hrsn_category: text("hrsn_category"), // Housing_Status, Food_Status, Financial_Status
});

// Symptom extraction results
export const extractedSymptoms = pgTable("extracted_symptoms", {
  id: serial("id").primaryKey(),
  mention_id: text("mention_id").notNull().unique(),
  patient_id: text("patient_id").notNull(),
  patient_name: text("patient_name"),
  provider_id: text("provider_id"),
  provider_name: text("provider_name"),
  dos_date: date("dos_date").notNull(),
  symptom_segment: text("symptom_segment").notNull(),
  symptom_id: text("symptom_id"),
  diagnosis: text("diagnosis"),
  diagnosis_icd10_code: text("diagnosis_icd10_code"),
  diagnostic_category: text("diagnostic_category"),
  // This column exists in extracted_symptoms as zcode_hrsn (no underscore)
  symp_prob: text("symp_prob"),
  zcode_hrsn: text("zcode_hrsn"),                    // Column name in DB is zcode_hrsn (NO underscore)
  symptom_present: text("symptom_present").default("Yes"),
  symptom_detected: text("symptom_detected").default("Yes"),
  validated: text("validated").default("Yes"),
  symptom_segments_in_note: integer("symptom_segments_in_note").default(1),
  position_in_text: integer("position_in_text"),  // Store position for deduplication and intensity
  housing_status: text("housing_status"),
  food_status: text("food_status"),
  financial_status: text("financial_status"),
  transportation_needs: text("transportation_needs"),
  has_a_car: text("has_a_car"),
  utility_insecurity: text("utility_insecurity"),
  childcare_needs: text("childcare_needs"),
  elder_care_needs: text("elder_care_needs"),
  employment_status: text("employment_status"),
  education_needs: text("education_needs"),
  legal_needs: text("legal_needs"),
  social_isolation: text("social_isolation"),
  user_id: integer("user_id").references(() => users.id),
  pre_processed: boolean("pre_processed").default(false)
});

// File uploads
export const fileUploads = pgTable("file_uploads", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  uploadDate: timestamp("upload_date").defaultNow(),
  processedStatus: boolean("processed_status").default(false),
  recordCount: integer("record_count"),
  patientCount: integer("patient_count"),
  userId: integer("user_id").references(() => users.id),
  fileHash: text("file_hash"), // MD5 or SHA-256 hash of the file content
  fileSize: integer("file_size"), // Size in bytes
  lastModified: timestamp("last_modified"), // Last modified timestamp from the file
  processingTime: integer("processing_time"), // Time taken to process in milliseconds
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
});

export const insertSymptomMasterSchema = createInsertSchema(symptomMaster).omit({
  id: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Allow manually setting ID for visualization purposes
export const insertExtractedSymptomSchema = createInsertSchema(extractedSymptoms);

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true,
  uploadDate: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

export type InsertSymptomMaster = z.infer<typeof insertSymptomMasterSchema>;
export type SymptomMaster = typeof symptomMaster.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertExtractedSymptom = z.infer<typeof insertExtractedSymptomSchema>;
export type ExtractedSymptom = typeof extractedSymptoms.$inferSelect;

export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;

// Data file schema
export const fileDataSchema = z.object({
  patient_id: z.string(),
  patient_name: z.string(),
  provider_id: z.string().optional(),
  provider_name: z.string().optional(),
  provider_lname: z.string().optional(),
  dos_date: z.string(),
  note_text: z.string(),
});

export type FileData = z.infer<typeof fileDataSchema>;

// Payment history schema
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").default("usd"),
  paymentType: text("payment_type").notNull(), // 'individual_search', 'population_search', 'subscription'
  searchType: text("search_type"), // 'individual' or 'population'
  patientCount: integer("patient_count"), // Number of patients included in search (for population searches)
  status: text("status").notNull(), // 'pending', 'completed', 'failed'
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeInvoiceId: text("stripe_invoice_id"),
  metadata: json("metadata"), // Additional payment details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Receipt items schema (for line items in receipts)
export const receiptItems = pgTable("receipt_items", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id").notNull(), // Will be updated with foreign key after receipts schema is defined
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // Amount in cents
  quantity: integer("quantity").default(1),
  unitPrice: integer("unit_price").notNull(), // Price per unit in cents
  itemType: text("item_type").notNull(), // 'individual_search', 'population_search', etc.
  metadata: json("metadata"), // Additional item details
  createdAt: timestamp("created_at").defaultNow(),
});

// Receipts schema
export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").references(() => payments.id),
  userId: integer("user_id").notNull().references(() => users.id),
  receiptNumber: text("receipt_number").notNull().unique(),
  receiptDate: timestamp("receipt_date").defaultNow(),
  amount: integer("amount").notNull(), // Amount in cents
  description: text("description").notNull(),
  itemCount: integer("item_count").default(1), // Number of searches or patients
  tax: integer("tax").default(0), // Tax in cents
  pdfUrl: text("pdf_url"), // URL to downloadable receipt PDF
  previousBalance: integer("previous_balance").default(0), // Previous balance in cents
  paymentsReceived: integer("payments_received").default(0), // Payments received in cents
  totalDue: integer("total_due"), // Total amount due including previous balance
  companyName: text("company_name").default("Behavioral Health Analytics"), // For custom company branding
  companyTaxId: text("company_tax_id").default("83-1234567"), // Tax ID/EIN
  companyAddress: text("company_address").default("123 Healthcare Avenue, Suite 400, San Francisco, CA 94103"),
  companyPhone: text("company_phone").default("(415) 555-9876"),
  companyEmail: text("company_email").default("billing@bh-analytics.com"),
  customerName: text("customer_name"), // Customer display name
  customerEmail: text("customer_email"), // Customer email address
  status: text("status").default("pending"), // 'pending', 'paid', 'overdue', 'canceled'
  dueDate: timestamp("due_date"), // When payment is due
  paymentTerms: text("payment_terms").default("Due on Receipt"),
  paymentMethod: text("payment_method"), // How it was paid
  notes: text("notes"), // Additional notes or comments
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Search params schema
export const searchParamsSchema = z.object({
  searchType: z.enum(["individual", "population"]),
  matchType: z.enum(["exact", "partial"]).optional(),
  patientId: z.string().optional(),
  patientName: z.string().optional(),
  providerName: z.string().optional(),
  providerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  useAllDates: z.boolean().optional(),
  useCachedData: z.boolean().optional(),
  populationCategory: z.enum(["diagnosis", "symptom", "category"]).optional(),
  populationView: z.enum(["trend", "distribution", "comparison"]).optional(),
  // HRSN filtering parameters
  selectedHrsnCategory: z.string().optional(),
  selectedHrsnValue: z.string().optional(),
  hrsnFilterType: z.enum(["housing_insecurity", "food_insecurity", "financial_status", "access_to_transportation", "veteran_status", "education_level", "has_a_car"]).optional(),
});

// Insert schemas for payments and receipts
export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  createdAt: true,
});

export type SearchParams = z.infer<typeof searchParamsSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;

// Processing status table to track long-running operations
export const processingStatus = pgTable("processing_status", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  processType: varchar("process_type", { length: 50 }).notNull(), // 'pre_processing', 'extraction', etc.
  status: varchar("status", { length: 20 }).notNull(), // 'pending', 'in_progress', 'completed', 'failed'
  progress: integer("progress").default(0), // 0-100
  currentStage: varchar("current_stage", { length: 50 }), // Current processing stage
  message: text("message"), // Status message
  totalItems: integer("total_items"), // Total items to process
  processedItems: integer("processed_items").default(0), // Items processed so far
  startTime: timestamp("start_time").defaultNow(),
  lastUpdateTime: timestamp("last_update_time").defaultNow(),
  endTime: timestamp("end_time"), // When process completed
  error: text("error"), // Error message if failed
});

export const insertProcessingStatusSchema = createInsertSchema(processingStatus).omit({
  id: true,
  lastUpdateTime: true,
  endTime: true,
});

export type InsertProcessingStatus = z.infer<typeof insertProcessingStatusSchema>;
export type ProcessingStatus = typeof processingStatus.$inferSelect;

// Symptom segments table for pivot data (used in pivot API)
export const symptomSegments = pgTable("symptom_segments", {
  id: serial("id").primaryKey(),
  patient_id: text("patient_id").notNull(),
  symptom_id: text("symptom_id").notNull(),
  symptom_segment: text("symptom_segment").notNull(),
  note_date: date("note_date").notNull(),
  diagnosis: text("diagnosis"),
  diagnosis_icd10_code: text("diagnosis_icd10_code"),
  diagnostic_category: text("diagnostic_category"),
  symp_prob: text("symp_prob"),
  zcode_hrsn: text("zcode_hrsn"),
  created_at: timestamp("created_at").defaultNow()
});

export type SymptomSegment = typeof symptomSegments.$inferSelect;

// Notification preferences schema
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  emailEnabled: boolean("email_enabled").default(true),
  uploadNotifications: boolean("upload_notifications").default(true),
  processingNotifications: boolean("processing_notifications").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences);
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;

// Process logs table for comprehensive tracking and monitoring
export const processLogs = pgTable("process_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'file_upload', 'pre_processing', 'extraction', 'search'
  processType: varchar("process_type", { length: 100 }), // More specific type like 'csv_upload', 'symptom_extraction'
  fileName: text("file_name"), // Original file name
  fileSize: integer("file_size"), // File size in bytes
  fileType: varchar("file_type", { length: 20 }), // 'csv', 'xlsx', 'json', etc.
  outcome: varchar("outcome", { length: 20 }).notNull(), // 'success', 'failure', 'partial_success'
  processingTimeMs: integer("processing_time_ms"), // Processing time in milliseconds
  processingStage: varchar("processing_stage", { length: 100 }), // Stage where process ended/failed
  reasonForFailure: text("reason_for_failure"), // Detailed failure reason
  correctiveActions: text("corrective_actions"), // Suggested corrective actions
  expectedRecords: integer("expected_records"), // Expected number of records to process
  actualRecords: integer("actual_records"), // Actual number of records processed
  patientsExpected: integer("patients_expected"), // Expected unique patients
  patientsActual: integer("patients_actual"), // Actual unique patients saved
  notesExpected: integer("notes_expected"), // Expected notes
  notesActual: integer("notes_actual"), // Actual notes saved
  validationErrors: integer("validation_errors").default(0), // Number of validation errors
  duplicatesFound: integer("duplicates_found").default(0), // Number of duplicate records found
  memoryUsageMb: integer("memory_usage_mb"), // Peak memory usage in MB
  cpuUsagePercent: integer("cpu_usage_percent"), // Average CPU usage percentage
  databaseQueryTimeMs: integer("database_query_time_ms"), // Total DB query time
  retryAttempts: integer("retry_attempts").default(0), // Number of retry attempts
  clientInfo: json("client_info"), // Browser/device information
  networkMetrics: json("network_metrics"), // Upload speed, connection info
  systemLoad: json("system_load"), // System performance metrics
  verificationResults: json("verification_results"), // Results from verification step
  emailNotificationSent: boolean("email_notification_sent").default(false), // Whether email notification was sent
  emailSentTime: timestamp("email_sent_time"), // When email notification was sent
  emailRecipient: text("email_recipient"), // Email address where notification was sent
  emailType: varchar("email_type", { length: 50 }), // Type of email: 'upload_complete', 'processing_complete', 'error_alert'
  emailDeliveryStatus: varchar("email_delivery_status", { length: 20 }), // 'sent', 'delivered', 'failed', 'bounced'
  additionalMetadata: json("additional_metadata"), // Any other relevant data
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProcessLogSchema = createInsertSchema(processLogs).omit({
  id: true,
  createdAt: true,
});

export type ProcessLog = typeof processLogs.$inferSelect;
export type InsertProcessLog = z.infer<typeof insertProcessLogSchema>;
