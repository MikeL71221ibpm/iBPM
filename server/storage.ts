import { 
  users, type User, type InsertUser,
  patients, type Patient, type InsertPatient,
  notes, type Note, type InsertNote,
  symptomMaster, type SymptomMaster, type InsertSymptomMaster,
  extractedSymptoms, type ExtractedSymptom, type InsertExtractedSymptom,
  fileUploads, type FileUpload, type InsertFileUpload,
  processingStatus, type ProcessingStatus, type InsertProcessingStatus,
  processLogs, type ProcessLog, type InsertProcessLog,
  type FileData, type SearchParams
} from "@shared/schema";

// Define the storage interface
import session from "express-session";
import createMemoryStore from "memorystore";

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStripeInfo(userId: number, info: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User>;
  executeRawQuery(sql: string, params?: any[]): Promise<any>;
  
  // File uploads
  saveFileUpload(fileUpload: InsertFileUpload): Promise<FileUpload>;
  recordFileUpload(uploadInfo: {
    userId: number;
    fileName: string;
    filePath: string;
    recordCount: number;
    patientCount: number;
    fileSize: number;
    uploadTime: Date;
    processedTime: Date;
  }): Promise<FileUpload>;
  getFileUploads(userId: number): Promise<FileUpload[]>;
  updateFileUpload(id: number, updates: Partial<FileUpload>): Promise<FileUpload>;
  getActiveProcessedFile(userId: number): Promise<FileUpload | null>;
  getRecentUploadedFiles(userId: number, limit?: number): Promise<FileUpload[]>;
  getLatestFileUpload(): Promise<FileUpload | null>;
  
  // Patient management
  savePatients(patients: InsertPatient[]): Promise<void>;
  getPatients(userId: number): Promise<Patient[]>;
  getPatientsByUserId(userId: number): Promise<Patient[]>;
  getPatientById(patientId: string): Promise<Patient | undefined>;
  getPatientsByName(name: string, isPartialMatch: boolean): Promise<Patient[]>;
  getPatientCount(userId: number): Promise<number>;
  
  // Notes management
  saveNotes(notes: InsertNote[]): Promise<void>;
  getNotesByPatientId(patientId: string): Promise<Note[]>;
  getNotesByUserId(userId: number, offset?: number, limit?: number): Promise<Note[]>;
  getNotesByDateRange(startDate: string, endDate: string): Promise<Note[]>;
  getNoteCount(userId: number): Promise<number>;
  
  // Symptom master
  saveSymptomMaster(symptoms: InsertSymptomMaster[]): Promise<void>;
  getSymptomMaster(): Promise<SymptomMaster[]>;
  
  // Extracted symptoms
  saveExtractedSymptoms(symptoms: InsertExtractedSymptom[]): Promise<void>;
  getAllExtractedSymptoms(userId: number): Promise<ExtractedSymptom[]>;
  getExtractedSymptomsByPatientId(patientId: string): Promise<ExtractedSymptom[]>;
  getExtractedSymptomsByDateRange(startDate: string, endDate: string): Promise<ExtractedSymptom[]>;
  getExtractedSymptomsByDiagnosisCategory(category: string): Promise<ExtractedSymptom[]>;
  
  // Search operations
  searchPatients(searchParams: SearchParams, userId: number | null, bypassUserFilter?: boolean): Promise<Patient[]>;
  getExtractedData(patientIds: string[], dateRange?: { startDate: string, endDate: string }): Promise<ExtractedSymptom[]>;
  getExtractedSymptomsByPatientId(patientId: string, userId: number): Promise<ExtractedSymptom[]>;
  
  // Processing status tracking
  createProcessingStatus(status: InsertProcessingStatus): Promise<ProcessingStatus>;
  updateProcessingStatus(id: number, updates: Partial<ProcessingStatus>): Promise<ProcessingStatus>;
  updateProcessingStatusByType(processType: string, userId: number, updates: Partial<ProcessingStatus>): Promise<ProcessingStatus | undefined>;
  getProcessingStatus(id: number): Promise<ProcessingStatus | undefined>;
  getProcessingStatusByType(userId: number, processType: string): Promise<ProcessingStatus[]>;
  getLatestProcessingStatus(userId: number, processType: string): Promise<ProcessingStatus | undefined>;
  
  // Verification methods
  getPatientCount(userId: number): Promise<number>;
  getNoteCount(userId: number): Promise<number>;
  
  // Process logging methods
  createProcessLog(log: InsertProcessLog): Promise<ProcessLog>;
  updateProcessLog(id: number, updates: Partial<ProcessLog>): Promise<ProcessLog>;
  getProcessLogs(filters: {
    page: number;
    limit: number;
    category?: string;
    outcome?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ logs: ProcessLog[]; total: number }>;
  getProcessLogsByCategory(userId: number, category: string): Promise<ProcessLog[]>;
  
  // Admin reporting methods
  getProcessLogsSummary(filters: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalProcesses: number;
    successRate: number;
    averageProcessingTime: number;
    categoryBreakdown: Record<string, number>;
    outcomeBreakdown: Record<string, number>;
    recentActivity: ProcessLog[];
  }>;

  getEmailLogs(filters: {
    page: number;
    limit: number;
    emailType?: string;
    deliveryStatus?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ logs: EmailLog[]; total: number }>;
  
  // Emergency reset functionality
  clearAllUserData(userId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private patientsMap: Map<string, Patient>;
  private notesMap: Map<number, Note>;
  private symptomMasterMap: Map<number, SymptomMaster>;
  private extractedSymptomsMap: Map<string, ExtractedSymptom>;
  private fileUploadsMap: Map<number, FileUpload>;
  private processingStatusMap: Map<number, ProcessingStatus>;
  private processLogsMap: Map<number, ProcessLog>;
  public sessionStore: session.Store;
  
  private currentIds: {
    userId: number,
    patientId: number,
    noteId: number,
    symptomMasterId: number,
    extractedSymptomId: number,
    fileUploadId: number,
    processingStatusId: number,
    processLogId: number
  };

  constructor() {
    this.users = new Map();
    this.patientsMap = new Map();
    this.notesMap = new Map();
    this.symptomMasterMap = new Map();
    this.extractedSymptomsMap = new Map();
    this.fileUploadsMap = new Map();
    this.processingStatusMap = new Map();
    this.processLogsMap = new Map();
    
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    this.currentIds = {
      userId: 1,
      patientId: 1,
      noteId: 1,
      symptomMasterId: 1,
      extractedSymptomId: 1,
      fileUploadId: 1,
      processingStatusId: 1,
      processLogId: 1
    };
    
    // Load symptom library on initialization
    this.initializeSymptomLibrary();
  }

  private async initializeSymptomLibrary() {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const symptomLibraryPath = path.join(process.cwd(), 'server/data/symptomLibrary.json');
      
      if (fs.existsSync(symptomLibraryPath)) {
        const symptomLibraryData = JSON.parse(fs.readFileSync(symptomLibraryPath, 'utf8'));
        
        // Load symptoms into the map
        for (const symptom of symptomLibraryData) {
          const symptomMasterRecord: SymptomMaster = {
            id: this.currentIds.symptomMasterId++,
            symptom_id: symptom.symptom_id || symptom.id,
            symptom_text: symptom.symptom_text || symptom.text || symptom.name,
            category: symptom.category,
            subcategory: symptom.subcategory,
            icd10_code: symptom.icd10_code,
            keywords: symptom.keywords,
            severity: symptom.severity,
            frequency: symptom.frequency
          };
          
          this.symptomMasterMap.set(symptomMasterRecord.id, symptomMasterRecord);
        }
        
        console.log(`✅ Loaded ${symptomLibraryData.length} symptoms into memory storage`);
      } else {
        console.log('⚠️ Symptom library file not found, using empty symptom database');
      }
    } catch (error) {
      console.error('Error loading symptom library:', error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUserStripeInfo(userId: number, info: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const updatedUser: User = {
      ...user,
      stripeCustomerId: info.stripeCustomerId,
      stripeSubscriptionId: info.stripeSubscriptionId,
      subscriptionStatus: 'active'
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // File uploads methods
  async saveFileUpload(fileUpload: InsertFileUpload): Promise<FileUpload> {
    const id = this.currentIds.fileUploadId++;
    const upload: FileUpload = { ...fileUpload, id, uploadDate: new Date() };
    this.fileUploadsMap.set(id, upload);
    return upload;
  }

  async recordFileUpload(uploadInfo: {
    userId: number;
    fileName: string;
    filePath: string;
    recordCount: number;
    patientCount: number;
    fileSize: number;
    uploadTime: Date;
    processedTime: Date;
  }): Promise<FileUpload> {
    const id = this.currentIds.fileUploadId++;
    const upload: FileUpload = {
      id,
      userId: uploadInfo.userId,
      fileName: uploadInfo.fileName,
      filePath: uploadInfo.filePath,
      fileSize: uploadInfo.fileSize,
      recordCount: uploadInfo.recordCount,
      patientCount: uploadInfo.patientCount,
      uploadDate: uploadInfo.uploadTime,
      processingDate: uploadInfo.processedTime,
      processingStatus: 'processed'
    };
    this.fileUploadsMap.set(id, upload);
    return upload;
  }

  async getFileUploads(userId: number): Promise<FileUpload[]> {
    return Array.from(this.fileUploadsMap.values())
      .filter(upload => upload.userId === userId);
  }

  async updateFileUpload(id: number, updates: Partial<FileUpload>): Promise<FileUpload> {
    const existing = this.fileUploadsMap.get(id);
    if (!existing) {
      throw new Error(`File upload with ID ${id} not found`);
    }
    
    const updated: FileUpload = {
      ...existing,
      ...updates,
      // Ensure we keep the original ID
      id: existing.id
    };
    
    this.fileUploadsMap.set(id, updated);
    return updated;
  }
  
  async getActiveProcessedFile(userId: number): Promise<FileUpload | null> {
    // Get all files for the user
    const userFiles = await this.getFileUploads(userId);
    
    // Filter to find processed files first (status='processed')
    const processedFiles = userFiles.filter(file => 
      file.processingStatus === 'processed' || 
      file.processingStatus === 'complete'
    );
    
    if (processedFiles.length === 0) {
      // No fully processed files found, try partial
      const partialFiles = userFiles.filter(file => 
        file.processingStatus === 'partial'
      );
      
      if (partialFiles.length === 0) {
        return null;
      }
      
      // Return the most recently processed partial file
      return partialFiles.sort((a, b) => 
        new Date(b.processingDate || b.uploadDate).getTime() - 
        new Date(a.processingDate || a.uploadDate).getTime()
      )[0];
    }
    
    // Return the most recently processed file
    return processedFiles.sort((a, b) => 
      new Date(b.processingDate || b.uploadDate).getTime() - 
      new Date(a.processingDate || a.uploadDate).getTime()
    )[0];
  }
  
  async getRecentUploadedFiles(userId: number, limit = 5): Promise<FileUpload[]> {
    // Get all files for the user
    const userFiles = await this.getFileUploads(userId);
    
    // Sort files by upload date, newest first
    const sortedFiles = userFiles.sort((a, b) => 
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );
    
    // Filter to get only unprocessed files
    const unprocessedFiles = sortedFiles.filter(file => 
      file.processingStatus === 'unprocessed' || 
      file.processingStatus === 'queued' ||
      file.processingStatus === 'processing'
    );
    
    // Return the most recent files, limited by the requested count
    return unprocessedFiles.slice(0, limit);
  }

  async getLatestFileUpload(): Promise<FileUpload | null> {
    // Get all files across all users
    const allFiles = Array.from(this.fileUploadsMap.values());
    
    if (allFiles.length === 0) {
      return null;
    }
    
    // Sort by upload date, newest first
    const sortedFiles = allFiles.sort((a, b) => 
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );
    
    // Return the most recent file
    return sortedFiles[0];
  }

  // Patient methods
  async savePatients(patients: InsertPatient[]): Promise<void> {
    for (const patient of patients) {
      const id = this.currentIds.patientId++;
      const patientRecord: Patient = { ...patient, id };
      this.patientsMap.set(patientRecord.patientId, patientRecord);
    }
  }

  async getPatientsByUserId(userId: number): Promise<Patient[]> {
    return Array.from(this.patientsMap.values())
      .filter(patient => patient.userId === userId);
  }

  async getPatientById(patientId: string): Promise<Patient | undefined> {
    return this.patientsMap.get(patientId);
  }

  async getPatientsByName(name: string, isPartialMatch: boolean): Promise<Patient[]> {
    return Array.from(this.patientsMap.values())
      .filter(patient => {
        if (isPartialMatch) {
          return patient.patientName.toLowerCase().includes(name.toLowerCase());
        } else {
          return patient.patientName.toLowerCase() === name.toLowerCase();
        }
      });
  }

  // Notes methods
  async saveNotes(notes: InsertNote[]): Promise<void> {
    for (const note of notes) {
      const id = this.currentIds.noteId++;
      const noteRecord: Note = { ...note, id };
      this.notesMap.set(id, noteRecord);
    }
  }

  async getNotesByPatientId(patientId: string): Promise<Note[]> {
    return Array.from(this.notesMap.values())
      .filter(note => note.patientId === patientId);
  }

  async getNotesByDateRange(startDate: string, endDate: string): Promise<Note[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return Array.from(this.notesMap.values())
      .filter(note => {
        const noteDate = new Date(note.dosDate);
        return noteDate >= start && noteDate <= end;
      });
  }

  // Symptom master methods
  async saveSymptomMaster(symptoms: InsertSymptomMaster[]): Promise<void> {
    for (const symptom of symptoms) {
      const id = this.currentIds.symptomMasterId++;
      const symptomRecord: SymptomMaster = { ...symptom, id };
      this.symptomMasterMap.set(id, symptomRecord);
    }
  }

  async getSymptomMaster(): Promise<SymptomMaster[]> {
    return Array.from(this.symptomMasterMap.values());
  }

  // Extracted symptoms methods
  async saveExtractedSymptoms(symptoms: InsertExtractedSymptom[]): Promise<void> {
    for (const symptom of symptoms) {
      const id = this.currentIds.extractedSymptomId++;
      const symptomRecord: ExtractedSymptom = { ...symptom, id };
      this.extractedSymptomsMap.set(symptomRecord.mentionId, symptomRecord);
    }
  }

  async getExtractedSymptomsByPatientId(patientId: string, userId?: number): Promise<ExtractedSymptom[]> {
    let results = Array.from(this.extractedSymptomsMap.values())
      .filter(symptom => symptom.patientId === patientId);
    
    // Apply user filter if provided
    if (userId !== undefined) {
      results = results.filter(symptom => symptom.userId === userId);
    }
    
    return results;
  }

  async getExtractedSymptomsByDateRange(startDate: string, endDate: string): Promise<ExtractedSymptom[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return Array.from(this.extractedSymptomsMap.values())
      .filter(symptom => {
        const symptomDate = new Date(symptom.dosDate);
        return symptomDate >= start && symptomDate <= end;
      });
  }

  async getExtractedSymptomsByDiagnosisCategory(category: string): Promise<ExtractedSymptom[]> {
    return Array.from(this.extractedSymptomsMap.values())
      .filter(symptom => symptom.diagnosticCategory === category);
  }

  // Search operations
  async searchPatients(searchParams: SearchParams, userId: number | null, bypassUserFilter?: boolean): Promise<Patient[]> {
    let results = Array.from(this.patientsMap.values());
    
    // Apply user filter unless bypassing
    if (!bypassUserFilter && userId !== null) {
      results = results.filter(patient => patient.userId === userId);
    }
    
    if (searchParams.patientId) {
      results = results.filter(patient => patient.patientId === searchParams.patientId);
    }
    
    if (searchParams.patientName) {
      if (searchParams.matchType === 'partial') {
        results = results.filter(patient => 
          patient.patientName.toLowerCase().includes(searchParams.patientName!.toLowerCase())
        );
      } else {
        results = results.filter(patient => 
          patient.patientName.toLowerCase() === searchParams.patientName!.toLowerCase()
        );
      }
    }
    
    if (searchParams.providerName) {
      results = results.filter(patient => 
        patient.providerLname?.toLowerCase().includes(searchParams.providerName!.toLowerCase())
      );
    }
    
    if (searchParams.providerId) {
      results = results.filter(patient => 
        patient.providerId === searchParams.providerId
      );
    }
    
    return results;
  }

  async getExtractedData(patientIds: string[], dateRange?: { startDate: string, endDate: string }): Promise<ExtractedSymptom[]> {
    let results = Array.from(this.extractedSymptomsMap.values())
      .filter(symptom => patientIds.includes(symptom.patientId));
    
    if (dateRange) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      
      results = results.filter(symptom => {
        const symptomDate = new Date(symptom.dosDate);
        return symptomDate >= start && symptomDate <= end;
      });
    }
    
    return results;
  }
  
  // For MemStorage, we'll provide a simple implementation that just logs and returns
  // This method is primarily used for database operations, which don't apply in memory
  async executeRawQuery(sql: string, params?: any[]): Promise<any> {
    console.log(`[Memory Storage] Would execute: ${sql}`);
    console.log(`[Memory Storage] With params:`, params);
    return { rows: [], rowCount: 0 };
  }
  
  // Processing status methods
  async createProcessingStatus(status: InsertProcessingStatus): Promise<ProcessingStatus> {
    const id = this.currentIds.processingStatusId++;
    const now = new Date();
    const record: ProcessingStatus = {
      ...status,
      id,
      lastUpdateTime: now,
      endTime: null,
      error: null
    };
    this.processingStatusMap.set(id, record);
    return record;
  }
  
  async updateProcessingStatus(id: number, updates: Partial<ProcessingStatus>): Promise<ProcessingStatus> {
    const existing = this.processingStatusMap.get(id);
    if (!existing) {
      throw new Error(`Processing status with ID ${id} not found`);
    }
    
    const now = new Date();
    const updated: ProcessingStatus = {
      ...existing,
      ...updates,
      lastUpdateTime: now
    };
    
    // If status is completed or failed, set the end time
    if (updates.status === 'completed' || updates.status === 'failed') {
      updated.endTime = now;
    }
    
    this.processingStatusMap.set(id, updated);
    return updated;
  }
  
  async getProcessingStatus(id: number): Promise<ProcessingStatus | undefined> {
    return this.processingStatusMap.get(id);
  }
  
  async getProcessingStatusByType(userId: number, processType: string): Promise<ProcessingStatus[]> {
    return Array.from(this.processingStatusMap.values())
      .filter(status => status.userId === userId && status.processType === processType)
      .sort((a, b) => {
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      });
  }
  
  async getLatestProcessingStatus(userId: number, processType: string): Promise<ProcessingStatus | undefined> {
    const statuses = await this.getProcessingStatusByType(userId, processType);
    return statuses.length > 0 ? statuses[0] : undefined;
  }
  
  async updateProcessingStatusByType(processType: string, userId: number, updates: Partial<ProcessingStatus>): Promise<ProcessingStatus | undefined> {
    try {
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
          startTime: new Date()
        };
        
        return await this.createProcessingStatus(newStatus);
      }
      
      // Update the existing status
      return await this.updateProcessingStatus(latestStatus.id, updates);
    } catch (error) {
      console.error(`Error updating processing status for user ${userId} and type ${processType}:`, error);
      return undefined;
    }
  }

  // Verification methods
  async getPatientCount(userId: number): Promise<number> {
    return Array.from(this.patientsMap.values())
      .filter(patient => patient.userId === userId).length;
  }

  async getNoteCount(userId: number): Promise<number> {
    return Array.from(this.notesMap.values())
      .filter(note => note.userId === userId).length;
  }

  // Process logging methods
  async createProcessLog(insertLog: InsertProcessLog): Promise<ProcessLog> {
    const id = ++this.currentIds.processLogId;
    const log: ProcessLog = { ...insertLog, id, createdAt: new Date() };
    this.processLogsMap.set(id, log);
    return log;
  }

  async updateProcessLog(id: number, updates: Partial<ProcessLog>): Promise<ProcessLog> {
    const existing = this.processLogsMap.get(id);
    if (!existing) {
      throw new Error(`Process log with id ${id} not found`);
    }
    const updated: ProcessLog = { ...existing, ...updates };
    this.processLogsMap.set(id, updated);
    return updated;
  }

  async getProcessLogs(userId: number, limit = 50): Promise<ProcessLog[]> {
    return Array.from(this.processLogsMap.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async getProcessLogsByCategory(userId: number, category: string): Promise<ProcessLog[]> {
    return Array.from(this.processLogsMap.values())
      .filter(log => log.userId === userId && log.category === category)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }
}

// Import the DatabaseStorage implementation 
import { DatabaseStorage } from "./database-storage";

// Use DatabaseStorage for production
export const storage = new DatabaseStorage();
