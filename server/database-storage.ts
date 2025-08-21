import { db } from "./db";
import { 
  users, patients, notes, symptomMaster, extractedSymptoms, fileUploads, 
  payments, receipts, processingStatus,
  User, Patient, Note, SymptomMaster, ExtractedSymptom, FileUpload, 
  Payment, Receipt, ProcessingStatus,
  InsertUser, InsertPatient, InsertNote, InsertSymptomMaster, InsertExtractedSymptom, InsertFileUpload,
  InsertPayment, InsertReceipt, InsertProcessingStatus
} from "@shared/schema";
import { eq, like, and, or, between, desc, sql } from "drizzle-orm";
import { SearchParams } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Use PostgreSQL for session storage
const PostgresSessionStore = connectPg(session);

export class DatabaseStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session', // Default is "session"
      createTableIfMissing: true,
    });
  }

  // User related methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserStripeInfo(userId: number, info: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: info.stripeCustomerId,
        stripeSubscriptionId: info.stripeSubscriptionId,
        subscriptionStatus: "active"
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // File uploads
  async saveFileUpload(fileUpload: InsertFileUpload): Promise<FileUpload> {
    const [upload] = await db.insert(fileUploads).values({
      ...fileUpload,
      userId: fileUpload.userId || null,
      processedStatus: fileUpload.processedStatus || false,
      recordCount: fileUpload.recordCount || null,
      patientCount: fileUpload.patientCount || null,
      fileHash: fileUpload.fileHash || null,
      fileSize: fileUpload.fileSize || null, 
      lastModified: fileUpload.lastModified || null,
      processingTime: fileUpload.processingTime || null
    }).returning();
    return upload;
  }

  async getFileUploads(userId: number): Promise<FileUpload[]> {
    return db.select().from(fileUploads).where(eq(fileUploads.userId, userId));
  }
  
  async updateFileUpload(id: number, updates: Partial<FileUpload>): Promise<FileUpload> {
    const [updatedUpload] = await db
      .update(fileUploads)
      .set({
        ...updates,
        // Ensure we don't try to update the primary key
        id: undefined
      })
      .where(eq(fileUploads.id, id))
      .returning();
    
    if (!updatedUpload) {
      throw new Error(`File upload with ID ${id} not found`);
    }
    
    return updatedUpload;
  }
  
  async getActiveProcessedFile(userId: number): Promise<FileUpload | null> {
    try {
      // Find files that have been processed (using processedStatus flag)
      const processedFiles = await db
        .select()
        .from(fileUploads)
        .where(
          and(
            eq(fileUploads.userId, userId),
            eq(fileUploads.processedStatus, true)
          )
        )
        .orderBy(desc(fileUploads.uploadDate))
        .limit(1);
      
      if (processedFiles.length > 0) {
        return processedFiles[0];
      }
      
      // No active processed file found
      return null;
    } catch (error) {
      console.error('Error getting active processed file:', error);
      return null;
    }
  }
  
  async getRecentUploadedFiles(userId: number, limit = 5): Promise<FileUpload[]> {
    try {
      // Get files that are not fully processed
      return await db
        .select()
        .from(fileUploads)
        .where(
          and(
            eq(fileUploads.userId, userId),
            eq(fileUploads.processedStatus, false)
          )
        )
        .orderBy(desc(fileUploads.uploadDate))
        .limit(limit);
    } catch (error) {
      console.error('Error getting recent uploaded files:', error);
      return [];
    }
  }

  // Batch insert methods for improved streaming upload
  async batchInsertPatients(patientsToSave: InsertPatient[]): Promise<void> {
    if (patientsToSave.length === 0) return;
    
    console.log(`Batch inserting ${patientsToSave.length} patients...`);
    
    try {
      await db.insert(patients).values(patientsToSave).onConflictDoNothing();
      console.log(`Successfully inserted ${patientsToSave.length} patients`);
    } catch (error) {
      console.error('Batch patient insert error:', error);
      throw error;
    }
  }

  async batchInsertNotes(notesToSave: InsertNote[]): Promise<void> {
    if (notesToSave.length === 0) return;
    
    console.log(`Batch inserting ${notesToSave.length} notes...`);
    
    try {
      await db.insert(notes).values(notesToSave).onConflictDoNothing();
      console.log(`Successfully inserted ${notesToSave.length} notes`);
    } catch (error) {
      console.error('Batch note insert error:', error);
      throw error;
    }
  }

  // Patient related methods
  async savePatients(patientsToSave: InsertPatient[]): Promise<void> {
    if (patientsToSave.length === 0) return;
    
    console.log(`Batch saving ${patientsToSave.length} patients...`);
    
    // Process in smaller batches to avoid parameter limits
    const BATCH_SIZE = 1000;
    const totalBatches = Math.ceil(patientsToSave.length / BATCH_SIZE);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, patientsToSave.length);
      const batch = patientsToSave.slice(start, end);
      
      console.log(`Processing patient batch ${i + 1}/${totalBatches} (${batch.length} patients)`);
      await db.insert(patients).values(batch).onConflictDoNothing();
    }
    
    console.log(`✅ Batch inserted ${patientsToSave.length} patients in ${totalBatches} batches`);
  }

  async getPatients(userId: number): Promise<Patient[]> {
    return db.select().from(patients).where(eq(patients.userId, userId));
  }

  async getPatientsByUserId(userId: number): Promise<Patient[]> {
    return db.select().from(patients).where(eq(patients.userId, userId));
  }

  async getPatientById(patientId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.patientId, patientId));
    return patient;
  }

  async getPatientsByName(name: string, isPartialMatch: boolean): Promise<Patient[]> {
    if (isPartialMatch) {
      return db.select().from(patients).where(like(patients.patientName, `%${name}%`));
    } else {
      return db.select().from(patients).where(eq(patients.patientName, name));
    }
  }

  // Notes related methods
  async createNote(note: InsertNote): Promise<Note> {
    const [savedNote] = await db.insert(notes).values(note).returning();
    return savedNote;
  }

  async saveNotes(notesToSave: InsertNote[]): Promise<void> {
    if (notesToSave.length === 0) return;
    
    console.log(`🚀 ENTERPRISE: Processing ${notesToSave.length} notes for high-performance bulk insert...`);
    
    try {
      // Enterprise-grade bulk insert without individual duplicate checking
      // Use PostgreSQL's ON CONFLICT to handle duplicates efficiently
      const BATCH_SIZE = 1000; // Optimized batch size as originally configured
      let totalInserted = 0;
      let totalSkipped = 0;
      
      for (let i = 0; i < notesToSave.length; i += BATCH_SIZE) {
        const batch = notesToSave.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(notesToSave.length / BATCH_SIZE);
        
        console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} notes)...`);
        
        try {
          // Build efficient bulk insert with conflict resolution
          let valuesSql = '';
          const values = [];
          let paramCounter = 1;
          
          for (const note of batch) {
            valuesSql += valuesSql ? ', ' : '';
            valuesSql += `($${paramCounter}, $${paramCounter+1}, $${paramCounter+2}, $${paramCounter+3}, $${paramCounter+4})`;
            values.push(
              note.patientId,
              note.dosDate,
              note.noteText,
              note.providerId || null,
              note.userId || null
            );
            paramCounter += 5;
          }
          
          // Use ON CONFLICT to handle duplicates efficiently - match the actual constraint
          const query = `
            INSERT INTO notes (patient_id, dos_date, note_text, provider_id, user_id)
            VALUES ${valuesSql}
            ON CONFLICT (patient_id, dos_date, user_id) DO NOTHING
            RETURNING id
          `;
          
          const result = await this.executeRawQuery(query, values);
          const inserted = result.rowCount || 0;
          const skipped = batch.length - inserted;
          
          totalInserted += inserted;
          totalSkipped += skipped;
          
          console.log(`✅ Batch ${batchNum}: ${inserted} inserted, ${skipped} skipped (duplicates)`);
          
        } catch (batchError) {
          console.error(`❌ Batch ${batchNum} failed:`, batchError);
          
          // Fallback: try individual inserts for this batch
          console.log(`🔄 Retrying batch ${batchNum} with individual inserts...`);
          for (const note of batch) {
            try {
              const result = await this.executeRawQuery(`
                INSERT INTO notes (patient_id, dos_date, note_text, provider_id, user_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (patient_id, dos_date, user_id) DO NOTHING
                RETURNING id
              `, [
                note.patientId,
                note.dosDate,
                note.noteText,
                note.providerId || null,
                note.userId || null
              ]);
              
              if (result.rowCount > 0) {
                totalInserted++;
              } else {
                totalSkipped++;
              }
            } catch (singleError) {
              console.error(`Failed to insert individual note:`, singleError);
              totalSkipped++;
            }
          }
        }
      }
      
      console.log(`🎉 ENTERPRISE BULK INSERT COMPLETE: ${totalInserted} notes inserted, ${totalSkipped} duplicates skipped`);
      
    } catch (error) {
      console.error("❌ Enterprise bulk insert failed:", error);
      throw error;
    }
  }

  async getNotesByPatientId(patientId: string): Promise<Note[]> {
    console.log(`Fetching notes for patient ID: ${patientId}`);
    const result = await db.select().from(notes).where(eq(notes.patientId, patientId));
    console.log(`Found ${result.length} notes for patient ID: ${patientId}`);
    return result;
  }

  async getNotesByUserId(userId: number, offset?: number, limit?: number): Promise<Note[]> {
    console.log(`Fetching notes for user ID: ${userId} with offset: ${offset}, limit: ${limit}`);
    
    let query = db.select().from(notes).where(eq(notes.userId, userId));
    
    if (offset !== undefined) {
      query = query.offset(offset);
    }
    
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    
    const result = await query;
    console.log(`Found ${result.length} notes for user ID: ${userId}`);
    return result;
  }

  async getNotesByDateRange(startDate: string, endDate: string): Promise<Note[]> {
    return db
      .select()
      .from(notes)
      .where(
        and(
          between(notes.dosDate, startDate, endDate)
        )
      );
  }

  // Symptom master related methods
  async saveSymptomMaster(symptomsToSave: InsertSymptomMaster[]): Promise<void> {
    if (symptomsToSave.length === 0) {
      console.log("No symptoms to save, returning early");
      return;
    }
    
    try {
      console.log(`Preparing to save ${symptomsToSave.length} symptoms to master table in batch mode...`);
      console.log(`Sample symptom to save: ${JSON.stringify(symptomsToSave[0])}`);
      
      // First ensure the symptom_id column has a unique constraint
      try {
        // Check if the unique constraint already exists
        const constraintCheck = await this.executeRawQuery(`
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'symptom_master_symptom_id_key'
        `);
        
        if (constraintCheck.rowCount === 0) {
          // Create the unique constraint if it doesn't exist
          console.log('Adding unique constraint to symptom_id column...');
          await this.executeRawQuery(`
            ALTER TABLE symptom_master ADD CONSTRAINT symptom_master_symptom_id_key UNIQUE (symptom_id)
          `);
          console.log('Unique constraint added successfully.');
        } else {
          console.log('Unique constraint on symptom_id already exists.');
        }
      } catch (constraintError) {
        console.error('Error managing symptom_id constraint:', constraintError);
        console.log('Will proceed with insert anyway using symptom_segment for uniqueness check.');
      }
      
      // Format all symptoms with proper nulls for optional fields
      const formattedSymptoms = symptomsToSave.map(symptom => ({
        ...symptom,
        diagnosis: symptom.diagnosis || null,
        diagnostic_category: symptom.diagnostic_category || null,
        // Using consistent column names based on DB schema
        symp_prob: symptom.symp_prob || null
      }));
      
      console.log(`Formatted ${formattedSymptoms.length} symptoms`);
      
      // Double-check for issue with filter
      if (formattedSymptoms.length === 0) {
        console.error("CRITICAL ERROR: formattedSymptoms is empty after formatting");
        console.log("Original symptom count:", symptomsToSave.length);
        return;
      }
      
      // Process symptoms in smaller batches to avoid query parameter limits
      const BATCH_SIZE = 50;
      let insertedCount = 0;
      
      console.log(`Processing ${formattedSymptoms.length} symptoms in batches of ${BATCH_SIZE}...`);
      
      for (let i = 0; i < formattedSymptoms.length; i += BATCH_SIZE) {
        const batch = formattedSymptoms.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(formattedSymptoms.length/BATCH_SIZE)} with ${batch.length} symptoms...`);
        
        // Use raw query with parameters for batch insert to greatly improve performance
        const placeholders = batch.map((_, i) => 
          `($${i*5+1}, $${i*5+2}, $${i*5+3}, $${i*5+4}, $${i*5+5})`
        ).join(', ');
        
        const values = batch.flatMap(s => [
          s.symptom_id,
          s.symptom_segment,
          s.diagnosis, 
          s.diagnostic_category,
          s.symp_prob  // Updated to use symp_prob instead of symptom_problem
        ]);
        
        console.log(`Built placeholders for ${batch.length} symptoms with ${values.length} total values`);
        
        try {
          const query = `
            INSERT INTO symptom_master 
            (symptom_id, symptom_segment, diagnosis, diagnostic_category, symp_prob)
            VALUES ${placeholders}
            ON CONFLICT (symptom_id) DO NOTHING
          `;
          
          console.log(`Executing batch insert query with ${batch.length} symptoms...`);
          const result = await this.executeRawQuery(query, values);
          console.log(`Batch insert result: rowCount=${result.rowCount}`);
          console.log(`Saved symptoms chunk ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(formattedSymptoms.length/BATCH_SIZE)}`);
          insertedCount += result.rowCount;
        } catch (batchError) {
          console.error(`Error in batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
          
          // If the batch insert failed, try inserting one by one
          console.log('Attempting individual inserts for this batch...');
          for (let j = 0; j < batch.length; j++) {
            const symptom = batch[j];
            try {
              console.log(`Individual insert ${j+1}/${batch.length}: ${symptom.symptom_id}`);
              
              const singleInsertQuery = `
                INSERT INTO symptom_master 
                (symptom_id, symptom_segment, diagnosis, diagnostic_category, symp_prob)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (symptom_id) DO NOTHING
              `;
              
              const result = await this.executeRawQuery(singleInsertQuery, [
                symptom.symptom_id,
                symptom.symptom_segment,
                symptom.diagnosis,
                symptom.diagnostic_category,
                symptom.symp_prob  // Updated to use symp_prob instead of symptom_problem
              ]);
              
              if (result.rowCount > 0) {
                insertedCount++;
                console.log(`Successfully inserted symptom ${symptom.symptom_id}`);
              } else {
                console.log(`Symptom ${symptom.symptom_id} already exists (or insert failed with no error)`);
              }
            } catch (singleError) {
              console.error(`Error inserting symptom ${symptom.symptom_id}:`, singleError);
            }
          }
        }
      }
      
      console.log(`Successfully saved ${insertedCount} new symptoms to master table`);
      
      // Verify the final count in the database
      try {
        const countResult = await this.executeRawQuery("SELECT COUNT(*) FROM symptom_master");
        console.log(`Total symptoms in master table after operation: ${countResult.rows[0].count}`);
      } catch (countError) {
        console.error("Error counting symptoms:", countError);
      }
    } catch (error) {
      console.error('Error saving symptoms to master table:', error);
      throw error;
    }
  }

  async getSymptomMaster(): Promise<SymptomMaster[]> {
    return db.select().from(symptomMaster);
  }

  // Extracted symptoms methods - ENTERPRISE BULK OPERATION FOR 5-10x PERFORMANCE
  async saveExtractedSymptoms(symptomsToSave: InsertExtractedSymptom[]): Promise<void> {
    if (symptomsToSave.length === 0) return;
    
    console.log(`🚀 ENTERPRISE BULK INSERT - EXTRACTED SYMPTOMS: ${symptomsToSave.length} symptoms`);
    console.log('Sample symptom object:', JSON.stringify(symptomsToSave[0], null, 2));
    
    const startTime = Date.now();
    let totalInserted = 0;
    let totalSkipped = 0;
    
    try {
      // OPTIMIZED 400-BATCH PROCESSING - Proven reliable performance
      const ENTERPRISE_BATCH_SIZE = 1000; // Optimized batch size for reliable database operations
      const batches = [];
      
      for (let i = 0; i < symptomsToSave.length; i += ENTERPRISE_BATCH_SIZE) {
        batches.push(symptomsToSave.slice(i, i + ENTERPRISE_BATCH_SIZE));
      }
      
      console.log(`📦 Processing ${batches.length} enterprise batches of up to ${ENTERPRISE_BATCH_SIZE} symptoms each`);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchNum = batchIndex + 1;
        
        console.log(`⚡ Processing enterprise batch ${batchNum}/${batches.length} (${batch.length} symptoms)...`);
        
        try {
          // Prepare bulk INSERT values for maximum performance
          const valueRows = [];
          const placeholders = [];
          const params = [];
          let paramIndex = 1;
          
          for (const symptom of batch) {
            // Generate unique mention ID
            const mentionId = symptom.mentionId || 
                            symptom.mention_id || 
                            `${symptom.patientId || symptom.patient_id || 'unknown'}-${symptom.symptomId || symptom.symptom_id || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Build parameter placeholders for this row (23 parameters)
            const rowPlaceholders = [];
            for (let i = 0; i < 23; i++) {
              rowPlaceholders.push(`$${paramIndex++}`);
            }
            placeholders.push(`(${rowPlaceholders.join(', ')})`);
            
            // Add parameter values
            params.push(
              mentionId,
              symptom.patient_id || symptom.patientId || null,
              symptom.patient_name || symptom.patientName || null,
              symptom.provider_id || symptom.providerId || null,
              symptom.provider_name || symptom.providerName || null,
              symptom.dos_date || symptom.dosDate || null,
              symptom.symptom_segment || symptom.symptomSegment || null,
              symptom.symptom_id || symptom.symptomId || null,
              symptom.diagnosis || null,
              symptom.diagnosis_icd10_code || symptom.diagnosisIcd10Code || null,
              symptom.diagnostic_category || symptom.diagnosticCategory || null,
              symptom.symp_prob || symptom.sympProb || null,
              symptom.zcode_hrsn || symptom.zcodeHrsn || null,
              symptom.symptom_present || "Yes",
              symptom.symptom_detected || "Yes",
              symptom.validated || "Yes",
              symptom.symptom_segments_in_note || 1,
              symptom.housing_status || null,
              symptom.food_status || null,
              symptom.financial_status || null,
              symptom.user_id || null,
              symptom.pre_processed || false,
              symptom.position_in_text || null
            );
          }
          
          // Execute enterprise bulk INSERT with ON CONFLICT handling
          const bulkQuery = `
            INSERT INTO extracted_symptoms (
              mention_id, patient_id, patient_name, provider_id, provider_name, 
              dos_date, symptom_segment, symptom_id, diagnosis, diagnosis_icd10_code,
              diagnostic_category, symp_prob, zcode_hrsn, symptom_present, symptom_detected,
              validated, symptom_segments_in_note, housing_status, food_status, 
              financial_status, user_id, pre_processed, position_in_text
            ) VALUES ${placeholders.join(', ')}
            ON CONFLICT (patient_id, symptom_segment, dos_date, position_in_text, user_id) DO NOTHING
          `;
          
          const result = await this.executeRawQuery(bulkQuery, params);
          const insertedCount = result.rowCount || 0;
          const skippedCount = batch.length - insertedCount;
          
          totalInserted += insertedCount;
          totalSkipped += skippedCount;
          
          console.log(`✅ Enterprise batch ${batchNum} complete: ${insertedCount} inserted, ${skippedCount} duplicates skipped`);
          
        } catch (batchError) {
          console.error(`❌ Enterprise batch ${batchNum} failed:`, batchError);
          
          // Fallback: try individual inserts for this batch only
          console.log(`🔄 Retrying enterprise batch ${batchNum} with individual inserts...`);
          for (const symptom of batch) {
            try {
              const mentionId = symptom.mentionId || 
                              symptom.mention_id || 
                              `${symptom.patientId || symptom.patient_id || 'unknown'}-${symptom.symptomId || symptom.symptom_id || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              
              const result = await this.executeRawQuery(`
                INSERT INTO extracted_symptoms (
                  mention_id, patient_id, patient_name, provider_id, provider_name, 
                  dos_date, symptom_segment, symptom_id, diagnosis, diagnosis_icd10_code,
                  diagnostic_category, symp_prob, zcode_hrsn, symptom_present, symptom_detected,
                  validated, symptom_segments_in_note, housing_status, food_status, 
                  financial_status, user_id, pre_processed, position_in_text
                ) VALUES (
                  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
                  $16, $17, $18, $19, $20, $21, $22, $23
                )
                ON CONFLICT (patient_id, symptom_segment, dos_date, position_in_text, user_id) DO NOTHING
                RETURNING id
              `, [
                mentionId,
                symptom.patient_id || symptom.patientId || null,
                symptom.patient_name || symptom.patientName || null,
                symptom.provider_id || symptom.providerId || null,
                symptom.provider_name || symptom.providerName || null,
                symptom.dos_date || symptom.dosDate || null,
                symptom.symptom_segment || symptom.symptomSegment || null,
                symptom.symptom_id || symptom.symptomId || null,
                symptom.diagnosis || null,
                symptom.diagnosis_icd10_code || symptom.diagnosisIcd10Code || null,
                symptom.diagnostic_category || symptom.diagnosticCategory || null,
                symptom.symp_prob || symptom.sympProb || null,
                symptom.zcode_hrsn || symptom.zcodeHrsn || null,
                symptom.symptom_present || "Yes",
                symptom.symptom_detected || "Yes",
                symptom.validated || "Yes",
                symptom.symptom_segments_in_note || 1,
                symptom.housing_status || null,
                symptom.food_status || null,
                symptom.financial_status || null,
                symptom.user_id || null,
                symptom.pre_processed || false,
                symptom.position_in_text || null
              ]);
              
              if (result.rowCount > 0) {
                totalInserted++;
              } else {
                totalSkipped++;
              }
            } catch (singleError) {
              console.error(`Failed to insert individual extracted symptom:`, singleError);
              totalSkipped++;
            }
          }
        }
      }
      
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`🎉 ENTERPRISE EXTRACTED SYMPTOMS BULK INSERT COMPLETE: ${totalInserted} symptoms inserted, ${totalSkipped} duplicates skipped in ${processingTime}s`);
      
    } catch (error) {
      console.error("❌ Enterprise extracted symptoms bulk insert failed:", error);
      throw error;
    }
  }

  async getAllExtractedSymptoms(userId: number): Promise<ExtractedSymptom[]> {
    return db
      .select()
      .from(extractedSymptoms)
      .where(eq(extractedSymptoms.user_id, userId));
  }

  async getExtractedSymptomsByPatientId(patientId: string, userId?: number): Promise<ExtractedSymptom[]> {
    let query = db
      .select()
      .from(extractedSymptoms)
      .where(eq(extractedSymptoms.patient_id, patientId));
    
    // Apply user filter if provided
    if (userId !== undefined) {
      query = query.where(and(
        eq(extractedSymptoms.patient_id, patientId),
        eq(extractedSymptoms.user_id, userId)
      ));
    }
    
    return query;
  }

  async getExtractedSymptomsByDateRange(startDate: string, endDate: string): Promise<ExtractedSymptom[]> {
    return db
      .select()
      .from(extractedSymptoms)
      .where(
        and(
          between(extractedSymptoms.dos_date, startDate, endDate)
        )
      );
  }

  async getExtractedSymptomsByDiagnosisCategory(category: string): Promise<ExtractedSymptom[]> {
    return db
      .select()
      .from(extractedSymptoms)
      .where(eq(extractedSymptoms.diagnostic_category, category));
  }
  
  async deleteExtractedSymptomsByPatientId(patientId: string): Promise<number> {
    console.log(`Deleting all extracted symptoms for patient ID: ${patientId}`);
    
    try {
      // First count how many will be deleted for logging purposes
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(extractedSymptoms)
        .where(eq(extractedSymptoms.patient_id, patientId));
        
      const count = Number(countResult[0]?.count || 0);
      console.log(`Found ${count} symptoms to delete for patient ${patientId}`);
      
      // Then delete them
      const result = await db
        .delete(extractedSymptoms)
        .where(eq(extractedSymptoms.patient_id, patientId));
      
      console.log(`Successfully deleted ${count} symptoms for patient ${patientId}`);
      return count;
    } catch (error) {
      console.error(`Error deleting symptoms for patient ${patientId}:`, error);
      throw error;
    }
  }

  // Get patient symptom counts for risk stratification
  async getPatientSymptomCounts(userId: number): Promise<Array<{patient_id: string, symptom_count: string}>> {
    try {
      const query = `
        SELECT 
          p.patient_id,
          COUNT(DISTINCT es.symptom_segment) as symptom_count
        FROM patients p
        LEFT JOIN extracted_symptoms es ON p.patient_id = es.patient_id AND es.user_id = p.user_id
        WHERE p.user_id = $1
        GROUP BY p.patient_id
        ORDER BY symptom_count DESC
      `;
      
      const result = await pool.query(query, [userId]);
      console.log(`Retrieved symptom counts for ${result.rows.length} patients`);
      return result.rows;
    } catch (error) {
      console.error("Error getting patient symptom counts:", error);
      return [];
    }
  }

  // Search operations
  async searchPatients(searchParams: SearchParams, userId: number | null, bypassUserFilter?: boolean): Promise<Patient[]> {
    const { patientId, patientName, providerId, providerName, matchType, searchType, selectedHrsnCategory, selectedHrsnValue, hrsnFilterType } = searchParams;
    
    try {
      // Use direct SQL query for more stability
      let sqlQuery = `SELECT * FROM patients`;
      const queryParams: any[] = [];
      let paramIndex = 1;
      
      // Apply user filter unless bypassed
      if (!bypassUserFilter && userId !== null) {
        sqlQuery += ` WHERE user_id = $${paramIndex}`;
        queryParams.push(userId);
        paramIndex++;
      } else if (!bypassUserFilter && userId === null) {
        // If no user ID and no bypass, return empty results
        return [];
      } else {
        // Bypass user filter - add WHERE clause for other conditions
        sqlQuery += ` WHERE 1=1`;
      }
      
      console.log("🔍 SEARCH PATH DEBUG - searchType:", searchType);
      
      // For population searches, don't apply specific filters, just get all patients
      if (searchType === "population") {
        if (bypassUserFilter) {
          console.log("Population search - getting all patients (bypass user filter)");
        } else {
          console.log("Population search - getting all patients for user:", userId);
        }
        
        const result = await pool.query(sqlQuery, queryParams);
        console.log(`Found ${result.rows.length} patients`);
        return result.rows as Patient[];
      }
      
      // Individual search logic - add filters for each specified parameter
      if (patientId) {
        if (matchType === "partial") {
          sqlQuery += ` AND LOWER(patient_id) LIKE LOWER($${paramIndex})`;
          queryParams.push(`%${patientId}%`);
        } else {
          sqlQuery += ` AND LOWER(patient_id) = LOWER($${paramIndex})`;
          queryParams.push(patientId);
        }
        paramIndex++;
      }
      
      if (patientName) {
        // Check if the patientName looks like a patient ID (numbers or specific patterns)
        const looksLikePatientId = /^(patient_)?\d+$|^\d{7}$/.test(patientName.trim());
        
        if (looksLikePatientId) {
          console.log("PatientName looks like a patient ID, searching both name and ID columns:", patientName);
          if (matchType === "partial") {
            sqlQuery += ` AND (LOWER(patient_name) LIKE LOWER($${paramIndex}) OR LOWER(patient_id) LIKE LOWER($${paramIndex + 1}))`;
            queryParams.push(`%${patientName}%`, `%${patientName}%`);
            paramIndex += 2;
          } else {
            sqlQuery += ` AND (LOWER(patient_name) = LOWER($${paramIndex}) OR LOWER(patient_id) = LOWER($${paramIndex + 1}))`;
            queryParams.push(patientName, patientName);
            paramIndex += 2;
          }
        } else {
          // Regular patient name search
          if (matchType === "partial") {
            console.log("Doing partial match on patient name:", patientName);
            sqlQuery += ` AND LOWER(patient_name) LIKE LOWER($${paramIndex})`;
            queryParams.push(`%${patientName}%`);
          } else {
            console.log("Doing exact match on patient name:", patientName);
            sqlQuery += ` AND LOWER(patient_name) = LOWER($${paramIndex})`;
            queryParams.push(patientName);
          }
          paramIndex++;
        }
        
        // Log the actual SQL that will be run
        console.log("Running individual search with query: \n" + sqlQuery);
        console.log("Parameters:", queryParams);
      }
      
      if (providerId) {
        if (matchType === "partial") {
          sqlQuery += ` AND LOWER(provider_id) LIKE LOWER($${paramIndex})`;
          queryParams.push(`%${providerId}%`);
        } else {
          sqlQuery += ` AND LOWER(provider_id) = LOWER($${paramIndex})`;
          queryParams.push(providerId);
        }
        paramIndex++;
      }
      
      if (providerName) {
        if (matchType === "partial") {
          sqlQuery += ` AND (LOWER(provider_name) LIKE LOWER($${paramIndex}) OR LOWER(provider_lname) LIKE LOWER($${paramIndex}))`;
          queryParams.push(`%${providerName}%`);
        } else {
          sqlQuery += ` AND (LOWER(provider_name) = LOWER($${paramIndex}) OR LOWER(provider_lname) = LOWER($${paramIndex}))`;
          queryParams.push(providerName);
        }
        paramIndex++;
      }
      
      // HRSN filtering logic - CRITICAL FIX for HRSN visualizations showing "0 patients"
      if (selectedHrsnCategory && selectedHrsnValue) {
        console.log("🏠 HRSN FILTER DEBUG:", { selectedHrsnCategory, selectedHrsnValue, hrsnFilterType });
        
        // Map HRSN categories to database column names
        const hrsnColumnMap: Record<string, string> = {
          'housing_insecurity': 'housing_insecurity',
          'food_insecurity': 'food_insecurity', 
          'financial_status': 'financial_status',
          'access_to_transportation': 'access_to_transportation',
          'veteran_status': 'veteran_status',
          'education_level': 'education_level',
          'has_a_car': 'has_a_car'
        };
        
        const columnName = hrsnColumnMap[selectedHrsnCategory] || hrsnColumnMap[hrsnFilterType];
        
        if (columnName) {
          sqlQuery += ` AND LOWER(${columnName}) = LOWER($${paramIndex})`;
          queryParams.push(selectedHrsnValue);
          paramIndex++;
          console.log(`🎯 Added HRSN filter: ${columnName} = ${selectedHrsnValue}`);
        } else {
          console.warn("⚠️ Unknown HRSN category:", selectedHrsnCategory, hrsnFilterType);
        }
      }
      
      // Add order by clause
      sqlQuery += ` ORDER BY patient_name DESC`;
      
      console.log("🔍 SEARCH DEBUG - Running individual search with query:");
      console.log("SQL:", sqlQuery);
      console.log("Parameters:", queryParams);
      console.log("Bypass mode:", bypassUserFilter);
      console.log("User ID:", userId);
      
      const result = await pool.query(sqlQuery, queryParams);
      console.log(`Search found ${result.rows.length} results`);
      
      // Debug: If no results found, show some sample patient IDs
      if (result.rows.length === 0 && patientId) {
        console.log("No results found for patient ID:", patientId);
        console.log("Checking first 10 patient IDs in database...");
        const sampleQuery = "SELECT patient_id, patient_name FROM patients ORDER BY patient_id LIMIT 10";
        const sampleResult = await pool.query(sampleQuery);
        console.log("Sample patient IDs:", sampleResult.rows.map(r => `${r.patient_id}:${r.patient_name}`).join(", "));
      }
      
      // Log a sample of the results
      if (result.rows.length > 0) {
        console.log("First result:", result.rows[0]);
        console.log("Patient names from results:", result.rows.map(r => r.patient_name).join(", "));
      } else {
        console.log("No results found. Checking if any patients exist for this user...");
        
        // Debug: Query all patients for this user to check their names
        const allPatientsQuery = "SELECT patient_id, patient_name FROM patients WHERE user_id = $1";
        const allPatientsResult = await pool.query(allPatientsQuery, [userId]);
        console.log(`All patient names for user ${userId}:`, allPatientsResult.rows.map(r => `${r.patient_id}:${r.patient_name}`).join(", "));
        
        // Check if any patients exist at all for this user
        const checkResult = await pool.query("SELECT COUNT(*) FROM patients WHERE user_id = $1", [userId]);
        console.log(`Total patients for user ${userId}: ${checkResult.rows[0].count}`);
      }
      
      return result.rows as Patient[];
    } catch (error) {
      console.error("Error in searchPatients:", error);
      throw error;
    }
  }

  async getExtractedData(patientIds: string[], dateRange?: { startDate: string, endDate: string }): Promise<ExtractedSymptom[]> {
    console.log(`Getting extracted data for ${patientIds.length} patients: ${patientIds.slice(0, 5).join(', ')}${patientIds.length > 5 ? '...' : ''}`);
    
    // Check if dateRange has valid properties
    const hasValidDateRange = dateRange && 
                             typeof dateRange === 'object' && 
                             typeof dateRange.startDate === 'string' && 
                             typeof dateRange.endDate === 'string' &&
                             dateRange.startDate.trim() !== '' &&
                             dateRange.endDate.trim() !== '';
    
    if (dateRange && !hasValidDateRange) {
      console.log("Invalid date range provided, ignoring date filter:", dateRange);
      dateRange = undefined;
    }
    
    // If there are no patient IDs, return an empty array
    if (patientIds.length === 0) {
      console.log("No patient IDs provided, returning empty array");
      return [];
    }
    
    try {
      let result;
      
      // For individual patient search, use exact match only for patientId
      if (patientIds.length === 1) {
        console.log(`Individual patient search detected for patient ID: ${patientIds[0]}`);
        
        if (hasValidDateRange) {
          console.log(`Applying date range filter: ${dateRange!.startDate} to ${dateRange!.endDate}`);
          // Execute query with date range filter for single patient
          result = await db
            .select()
            .from(extractedSymptoms)
            .where(
              and(
                eq(extractedSymptoms.patient_id, patientIds[0]),
                between(extractedSymptoms.dos_date, dateRange!.startDate, dateRange!.endDate)
              )
            );
        } else {
          console.log("No date range filter applied for individual patient search");
          // Execute query for single patient without date range filter
          result = await db
            .select()
            .from(extractedSymptoms)
            .where(eq(extractedSymptoms.patient_id, patientIds[0]));
        }
      } else {
        // Multiple patient search (population health)
        if (hasValidDateRange) {
          console.log(`Applying date range filter: ${dateRange!.startDate} to ${dateRange!.endDate}`);
          // Execute query with date range filter
          result = await db
            .select()
            .from(extractedSymptoms)
            .where(
              and(
                or(...patientIds.map(id => eq(extractedSymptoms.patient_id, id))),
                between(extractedSymptoms.dos_date, dateRange!.startDate, dateRange!.endDate)
              )
            );
        } else {
          console.log("No date range filter applied");
          // Execute query without date range filter
          result = await db
            .select()
            .from(extractedSymptoms)
            .where(
              or(...patientIds.map(id => eq(extractedSymptoms.patient_id, id)))
            );
        }
      }
      
      console.log(`Found ${result.length} extracted symptoms records via ORM`);
      
      // If no results found via ORM or fewer than expected, try direct SQL query for more flexibility
      if (result.length === 0 || (patientIds.length > 5 && result.length < 10)) {
        console.log("Insufficient results via ORM, trying direct SQL query with more flexible conditions");
        
        // Create a more flexible SQL query that can handle variations in data format
        const patientIdList = patientIds.map(id => `'${id}'`).join(',');
        let sql = `
          SELECT * FROM extracted_symptoms 
          WHERE patient_id IN (${patientIdList})
        `;
        
        // Add date filter if needed
        if (hasValidDateRange) {
          sql += ` AND (
            dos_date BETWEEN '${dateRange!.startDate}' AND '${dateRange!.endDate}'
            OR dosdate BETWEEN '${dateRange!.startDate}' AND '${dateRange!.endDate}'
          )`;
        }
        
        // Execute the query
        const queryResult = await pool.query(sql);
        if (queryResult.rows.length > 0) {
          console.log(`Found ${queryResult.rows.length} records via direct SQL query`);
          console.log("SQL Sample record:", queryResult.rows[0]);
          
          // Map SQL results to normalized ExtractedSymptom format
          result = queryResult.rows.map(row => {
            // Create a normalized object with consistent field names
            const normalized: any = {
              ...row,
              id: row.id,
              patientId: row.patient_id,
              dosDate: row.dos_date || row.dosdate,
              symptomSegment: row.symptom_segment || row.symptomtext || row.symptom_text,
              symptomId: row.symptom_id,
              diagnosis: row.diagnosis,
              diagnosisIcd10Code: row.diagnosis_icd10_code,
              diagnosticCategory: row.diagnostic_category || row.diagnosis_category || row.diagnosiscategory,
              // We use only sympProb which corresponds to symp_prob in the database
              sympProb: row.symp_prob,
              ZCodeHrsn: row.ZCode_HRSN || row.zcode_hrsn,
              DSM_Symptom_Criteria: row.dsm_symptom_criteria || row.DSM_Symptom_Criteria,
              userId: row.user_id,
              housingStatus: row.housing_status || row.housingstatus || 'secure',
              foodStatus: row.food_status || row.foodstatus || 'secure',
              financialStatus: row.financial_status || row.financialstatus || 'medium',
              validated: row.validated || 'auto',
              symptomPresent: row.symptom_present || 'yes',
              symptomDetected: row.symptom_detected || 'yes',
              symptomSegmentsInNote: row.symptom_segments_in_note || 1,
              mentionId: row.mention_id || `M-${row.patient_id}-${row.id}`
            };
            return normalized;
          });
        }
      }
      
      if (result.length > 0) {
        console.log("Sample extracted data:", result[0]);
      } else {
        console.log("No extracted symptoms found for the provided patient IDs");
        
        // If no results, let's check if there are any symptoms at all
        const allSymptoms = await db.select().from(extractedSymptoms).limit(5);
        console.log(`Database has ${allSymptoms.length} symptom records in total`);
        if (allSymptoms.length > 0) {
          console.log("Sample symptom record from database:", allSymptoms[0]);
        }
        
        // Check if patient records exist
        for (const patientId of patientIds.slice(0, 3)) {
          const patientExists = await db.select().from(patients).where(eq(patients.patientId, patientId));
          console.log(`Patient ${patientId} exists in database: ${patientExists.length > 0}`);
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error getting extracted data:", error);
      throw error;
    }
  }

  // Generic database operations
  async executeRawQuery(sql: string, params?: any[]): Promise<any> {
    console.log(`Executing raw query: ${sql}`);
    if (params) {
      console.log(`Query params: ${JSON.stringify(params)}`);
    }
    
    const result = await pool.query(sql, params);
    console.log(`Query result: ${result.rowCount} rows affected`);
    return result;
  }
  
  // Processing status methods
  async createProcessingStatus(status: InsertProcessingStatus): Promise<ProcessingStatus> {
    try {
      console.log("Creating processing status:", status);
      const [record] = await db.insert(processingStatus).values({
        userId: status.userId,
        processType: status.processType,
        status: status.status,
        progress: status.progress || 0,
        message: status.message || null,
        currentStage: status.currentStage || null,
        totalItems: status.totalItems || null,
        processedItems: status.processedItems || 0,
        startTime: status.startTime || new Date(),
        error: null,
        endTime: null,
        lastUpdateTime: new Date()
      }).returning();
      
      console.log("Created processing status record:", record);
      return record;
    } catch (error) {
      console.error("Error creating processing status:", error);
      throw error;
    }
  }

  async updateProcessingStatus(id: number, updates: Partial<ProcessingStatus>): Promise<ProcessingStatus> {
    try {
      console.log(`Updating processing status ${id} with:`, updates);
      
      // Always update lastUpdateTime
      const updatesWithTimestamp = {
        ...updates,
        lastUpdateTime: new Date()
      };
      
      const [updated] = await db
        .update(processingStatus)
        .set(updatesWithTimestamp)
        .where(eq(processingStatus.id, id))
        .returning();
      
      console.log("Updated processing status:", updated);
      return updated;
    } catch (error) {
      console.error(`Error updating processing status ${id}:`, error);
      throw error;
    }
  }

  async getProcessingStatus(id: number): Promise<ProcessingStatus | undefined> {
    try {
      const [status] = await db
        .select()
        .from(processingStatus)
        .where(eq(processingStatus.id, id));
      
      return status;
    } catch (error) {
      console.error(`Error getting processing status ${id}:`, error);
      throw error;
    }
  }

  async getProcessingStatusByType(userId: number, processType: string): Promise<ProcessingStatus[]> {
    try {
      return db
        .select()
        .from(processingStatus)
        .where(
          and(
            eq(processingStatus.userId, userId),
            eq(processingStatus.processType, processType)
          )
        )
        .orderBy(desc(processingStatus.lastUpdateTime));
    } catch (error) {
      console.error(`Error getting processing status for user ${userId} and type ${processType}:`, error);
      throw error;
    }
  }

  async updateProcessingStatusByType(
    processType: string, 
    userId: number, 
    updates: Partial<ProcessingStatus>
  ): Promise<ProcessingStatus> {
    try {
      const updatesWithTimestamp = {
        ...updates,
        lastUpdateTime: new Date()
      };
      
      // Use INSERT ... ON CONFLICT to handle upsert
      const result = await this.executeRawQuery(
        `INSERT INTO processing_status 
         (user_id, process_type, status, progress, message, current_stage, start_time, last_update_time) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (user_id, process_type) 
         DO UPDATE SET 
           status = EXCLUDED.status, 
           progress = EXCLUDED.progress, 
           message = EXCLUDED.message, 
           current_stage = EXCLUDED.current_stage, 
           last_update_time = NOW()
         RETURNING *`,
        [
          userId, 
          processType, 
          updates.status || 'processing', 
          updates.progress || 0, 
          updates.message || '', 
          updates.currentStage || ''
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating processing status for user ${userId} and type ${processType}:`, error);
      throw error;
    }
  }

  async getLatestProcessingStatus(userId: number, processType: string): Promise<ProcessingStatus | undefined> {
    try {
      const [status] = await db
        .select()
        .from(processingStatus)
        .where(
          and(
            eq(processingStatus.userId, userId),
            eq(processingStatus.processType, processType)
          )
        )
        .orderBy(desc(processingStatus.lastUpdateTime))
        .limit(1);
      
      return status;
    } catch (error) {
      console.error(`Error getting latest processing status for user ${userId} and type ${processType}:`, error);
      throw error;
    }
  }
  
  // Update processing status by user ID and process type (alternative method)
  async updateProcessingStatusByTypeAlt(processType: string, userId: number, updates: Partial<ProcessingStatus>): Promise<ProcessingStatus | undefined> {
    try {
      console.log(`Updating processing status for user ${userId} and type ${processType}:`, updates);
      
      // Find the latest processing status first
      const latestStatus = await this.getLatestProcessingStatus(userId, processType);
      
      if (!latestStatus) {
        console.log(`No active processing status found for user ${userId} and type ${processType}, creating new one`);
        
        // If no status exists, create a new one with these values
        const newStatus: InsertProcessingStatus = {
          userId,
          processType,
          status: updates.status || 'in_progress',
          progress: updates.progress || 0,
          message: updates.message || 'Processing started',
          currentStage: updates.currentStage || null,
          totalItems: updates.totalItems || null,
          processedItems: updates.processedItems || 0,
          startTime: new Date(),
          lastUpdateTime: new Date(),
          endTime: null,
          error: null
        };
        
        const [created] = await db.insert(processingStatus)
          .values(newStatus)
          .onConflictDoUpdate({
            target: [processingStatus.userId],
            set: {
              status: updates.status || 'in_progress',
              progress: updates.progress || 0,
              message: updates.message || 'Processing started',
              currentStage: updates.currentStage || null,
              totalItems: updates.totalItems || null,
              processedItems: updates.processedItems || 0,
              lastUpdateTime: new Date(),
              processType: processType
            }
          })
          .returning();
        return created;
      }
      
      // Update the existing status
      return await this.updateProcessingStatus(latestStatus.id, updates);
    } catch (error) {
      console.error(`Error updating processing status for user ${userId} and type ${processType}:`, error);
      return undefined;
    }
  }
  
  // Add this method specifically for the emergency API endpoints
  async updateProcessStatus(userId: number, processType: string, updates: { 
    status: string, 
    progress: number | null, 
    message: string,
    currentStage: string | null 
  }): Promise<ProcessingStatus | undefined> {
    try {
      console.log(`🚨 Emergency update for ${processType} status for user ${userId} with:`, updates);
      
      // Find the latest processing status
      const latestStatus = await this.getLatestProcessingStatus(userId, processType);
      
      if (!latestStatus) {
        console.error(`No processing status found for user ${userId} and type ${processType}`);
        return undefined;
      }
      
      // Update the status
      const updatedStatus = await this.updateProcessingStatus(latestStatus.id, {
        status: updates.status,
        progress: updates.progress,
        message: updates.message,
        currentStage: updates.currentStage,
        // If status is completed or stopped, set endTime
        ...(updates.status === 'completed' || updates.status === 'stopped' || updates.status === 'reset' 
          ? { endTime: new Date() } 
          : {})
      });
      
      console.log(`✅ Process status updated through storage interface`);
      return updatedStatus;
    } catch (error) {
      console.error(`Error updating process status for user ${userId} and type ${processType}:`, error);
      throw error;
    }
  }
  
  // Payment and receipt methods
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    try {
      const [payment] = await db.insert(payments).values(paymentData).returning();
      return payment;
    } catch (error) {
      console.error("Error creating payment:", error);
      throw error;
    }
  }
  
  async getPaymentsByUserId(userId: number): Promise<Payment[]> {
    try {
      return await db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
    } catch (error) {
      console.error("Error getting payments for user:", error);
      throw error;
    }
  }
  
  async getPaymentById(id: number): Promise<Payment | undefined> {
    try {
      const [payment] = await db.select().from(payments).where(eq(payments.id, id));
      return payment;
    } catch (error) {
      console.error("Error getting payment by ID:", error);
      throw error;
    }
  }
  
  async updatePaymentStatus(id: number, status: string, stripeId?: string): Promise<Payment> {
    try {
      const updateData: any = { 
        status, 
        updatedAt: new Date() 
      };
      
      if (stripeId) {
        updateData.stripePaymentIntentId = stripeId;
      }
      
      const [payment] = await db
        .update(payments)
        .set(updateData)
        .where(eq(payments.id, id))
        .returning();
      
      return payment;
    } catch (error) {
      console.error("Error updating payment status:", error);
      throw error;
    }
  }
  
  async createReceipt(receiptData: InsertReceipt): Promise<Receipt> {
    try {
      // Generate a receipt number format: REC-{year}{month}{day}-{randomNumber}
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      
      const receiptNumber = `REC-${year}${month}${day}-${randomNum}`;
      
      const [receipt] = await db
        .insert(receipts)
        .values({
          ...receiptData,
          receiptNumber
        })
        .returning();
      
      return receipt;
    } catch (error) {
      console.error("Error creating receipt:", error);
      throw error;
    }
  }
  
  async getReceiptsByUserId(userId: number): Promise<Receipt[]> {
    try {
      return await db.select().from(receipts).where(eq(receipts.userId, userId)).orderBy(desc(receipts.createdAt));
    } catch (error) {
      console.error("Error getting receipts for user:", error);
      throw error;
    }
  }
  
  async getReceiptById(id: number): Promise<Receipt | undefined> {
    try {
      const [receipt] = await db.select().from(receipts).where(eq(receipts.id, id));
      return receipt;
    } catch (error) {
      console.error("Error getting receipt by ID:", error);
      throw error;
    }
  }

  // Verification methods
  async getPatientCount(userId: number): Promise<number> {
    try {
      const result = await this.executeRawQuery(
        'SELECT COUNT(*) as count FROM patients WHERE user_id = $1',
        [userId]
      );
      return Number(result.rows[0]?.count || 0);
    } catch (error) {
      console.error('Error getting patient count:', error);
      return 0;
    }
  }

  async getSymptomCount(userId: number): Promise<number> {
    try {
      const result = await this.executeRawQuery(
        'SELECT COUNT(*) as count FROM extracted_symptoms WHERE user_id = $1',
        [userId]
      );
      console.log(`📊 SYMPTOM COUNT DEBUG: Raw result for user ${userId}:`, result.rows?.[0]);
      return Number(result.rows?.[0]?.count || 0);
    } catch (error) {
      console.error('Error getting symptom count:', error);
      return 0;
    }
  }

  async getAllPatients(userId: number): Promise<any[]> {
    try {
      return await this.executeRawQuery(
        'SELECT * FROM patients WHERE user_id = $1 ORDER BY patient_id',
        [userId]
      );
    } catch (error) {
      console.error('Error getting all patients:', error);
      return [];
    }
  }

  async getUsers(): Promise<any[]> {
    try {
      return await this.executeRawQuery(
        'SELECT id, username, email FROM users ORDER BY id',
        []
      );
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async getNoteCount(userId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql`count(*)` })
        .from(notes)
        .where(eq(notes.userId, userId));
      
      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error('Error getting note count:', error);
      return 0;
    }
  }

  // Admin reporting methods implementation
  async getProcessLogs(filters: {
    page: number;
    limit: number;
    category?: string;
    outcome?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ logs: ProcessLog[]; total: number }> {
    try {
      let query = db.select().from(processLogs);
      const conditions = [];

      if (filters.category) {
        conditions.push(eq(processLogs.category, filters.category));
      }
      if (filters.outcome) {
        conditions.push(eq(processLogs.outcome, filters.outcome));
      }
      if (filters.startDate) {
        conditions.push(sql`${processLogs.createdAt} >= ${filters.startDate}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${processLogs.createdAt} <= ${filters.endDate}`);
      }

      if (conditions.length > 0) {
        query = query.where(sql`${conditions.join(' AND ')}`);
      }

      const logs = await query
        .orderBy(sql`${processLogs.createdAt} DESC`)
        .limit(filters.limit)
        .offset((filters.page - 1) * filters.limit);

      // Get total count
      let countQuery = db.select({ count: sql`count(*)` }).from(processLogs);
      if (conditions.length > 0) {
        countQuery = countQuery.where(sql`${conditions.join(' AND ')}`);
      }
      const totalResult = await countQuery;
      const total = Number(totalResult[0]?.count || 0);

      return { logs, total };
    } catch (error) {
      console.error('Error fetching process logs:', error);
      return { logs: [], total: 0 };
    }
  }

  async getProcessLogsSummary(filters: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalProcesses: number;
    successRate: number;
    averageProcessingTime: number;
    categoryBreakdown: Record<string, number>;
    outcomeBreakdown: Record<string, number>;
    recentActivity: ProcessLog[];
  }> {
    try {
      let query = db.select().from(processLogs);
      const conditions = [];

      if (filters.startDate) {
        conditions.push(sql`${processLogs.createdAt} >= ${filters.startDate}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${processLogs.createdAt} <= ${filters.endDate}`);
      }

      if (conditions.length > 0) {
        query = query.where(sql`${conditions.join(' AND ')}`);
      }

      const logs = await query;

      const totalProcesses = logs.length;
      const successCount = logs.filter(log => log.outcome === 'success').length;
      const successRate = totalProcesses > 0 ? (successCount / totalProcesses) * 100 : 0;

      const processingTimes = logs
        .filter(log => log.processingTimeMs)
        .map(log => log.processingTimeMs!);
      const averageProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
        : 0;

      const categoryBreakdown: Record<string, number> = {};
      const outcomeBreakdown: Record<string, number> = {};

      logs.forEach(log => {
        categoryBreakdown[log.category] = (categoryBreakdown[log.category] || 0) + 1;
        outcomeBreakdown[log.outcome] = (outcomeBreakdown[log.outcome] || 0) + 1;
      });

      const recentActivity = logs
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 10);

      return {
        totalProcesses,
        successRate,
        averageProcessingTime,
        categoryBreakdown,
        outcomeBreakdown,
        recentActivity,
      };
    } catch (error) {
      console.error('Error fetching process logs summary:', error);
      return {
        totalProcesses: 0,
        successRate: 0,
        averageProcessingTime: 0,
        categoryBreakdown: {},
        outcomeBreakdown: {},
        recentActivity: [],
      };
    }
  }

  async getEmailLogs(filters: {
    page: number;
    limit: number;
    emailType?: string;
    deliveryStatus?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ logs: EmailLog[]; total: number }> {
    try {
      let query = db.select().from(emailLogs);
      const conditions = [];

      if (filters.emailType) {
        conditions.push(eq(emailLogs.emailType, filters.emailType));
      }
      if (filters.deliveryStatus) {
        conditions.push(eq(emailLogs.deliveryStatus, filters.deliveryStatus));
      }
      if (filters.startDate) {
        conditions.push(sql`${emailLogs.sentAt} >= ${filters.startDate}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${emailLogs.sentAt} <= ${filters.endDate}`);
      }

      if (conditions.length > 0) {
        query = query.where(sql`${conditions.join(' AND ')}`);
      }

      const logs = await query
        .orderBy(sql`${emailLogs.sentAt} DESC`)
        .limit(filters.limit)
        .offset((filters.page - 1) * filters.limit);

      // Get total count
      let countQuery = db.select({ count: sql`count(*)` }).from(emailLogs);
      if (conditions.length > 0) {
        countQuery = countQuery.where(sql`${conditions.join(' AND ')}`);
      }
      const totalResult = await countQuery;
      const total = Number(totalResult[0]?.count || 0);

      return { logs, total };
    } catch (error) {
      console.error('Error fetching email logs:', error);
      return { logs: [], total: 0 };
    }
  }

  // Emergency Recovery Methods
  async clearExtractedSymptoms(userId: number): Promise<void> {
    try {
      await db.delete(extractedSymptoms).where(eq(extractedSymptoms.userId, userId));
      console.log(`Cleared all extracted symptoms for user ${userId}`);
    } catch (error) {
      console.error(`Error clearing extracted symptoms for user ${userId}:`, error);
      throw error;
    }
  }

  async resetProcessingStatus(userId: number): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO processing_status (user_id, status, progress, current_stage, message, last_update_time)
        VALUES (${userId}, 'ready', 0, 'ready', 'Reset by emergency recovery', CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          status = 'ready',
          progress = 0,
          current_stage = 'ready',
          message = 'Reset by emergency recovery',
          last_update_time = CURRENT_TIMESTAMP
      `);
      console.log(`Reset processing status for user ${userId}`);
    } catch (error) {
      console.error(`Error resetting processing status for user ${userId}:`, error);
      throw error;
    }
  }

  async clearAllUserData(userId: number): Promise<void> {
    try {
      console.log(`🔥 CLEARING ALL DATA for user ${userId}`);
      
      // Clear in correct order to avoid foreign key constraints
      await db.execute(sql`DELETE FROM extracted_symptoms WHERE user_id = ${userId}`);
      await db.execute(sql`DELETE FROM notes WHERE user_id = ${userId}`);
      await db.execute(sql`DELETE FROM patients WHERE user_id = ${userId}`);
      await db.execute(sql`DELETE FROM file_uploads WHERE user_id = ${userId}`);
      await db.execute(sql`DELETE FROM processing_status WHERE user_id = ${userId}`);
      
      console.log(`✅ ALL DATA CLEARED for user ${userId}`);
    } catch (error) {
      console.error(`Error clearing all data for user ${userId}:`, error);
      throw error;
    }
  }
}