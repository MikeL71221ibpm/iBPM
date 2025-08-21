// Daily Reports API Routes
// Handles upload, processing, and download of daily patient reports

import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import XLSX from 'xlsx';
import { PatientMatcher, ScheduledPatient } from '../services/patient-matcher';
import { ReportGenerator } from '../services/report-generator';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { isAuthenticated } from '../auth';
// No longer using processFileData - direct parsing for Daily Reports

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/daily-reports/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File upload validation:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname,
      size: file.size
    });
    
    // Check file extension first (most reliable)
    const isValidExtension = file.originalname.match(/\.(csv|xls|xlsx)$/i);
    
    if (!isValidExtension) {
      return cb(new Error('Only CSV and Excel files (.csv, .xls, .xlsx) are allowed. Please check your file extension.'));
    }
    
    // Check mimetype as secondary validation
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/csv',
      'text/plain', // Sometimes Excel files come through as text/plain
      'application/octet-stream' // Some systems send Excel as binary
    ];
    
    if (allowedTypes.includes(file.mimetype) || isValidExtension) {
      console.log('✅ File validation passed');
      cb(null, true);
    } else {
      console.log('❌ File validation failed - invalid mimetype:', file.mimetype);
      cb(new Error(`File type not supported. Detected: ${file.mimetype}. Please upload a CSV or Excel file (.csv, .xls, .xlsx).`));
    }
  },
});

// Import persistent job storage
import { jobPersistence } from '../services/job-persistence';

// Upload tomorrow's patient schedule
router.post('/upload', isAuthenticated, upload.single('schedule'), async (req, res) => {
  try {
    console.log('📁 Upload request received');
    
    if (!req.file) {
      console.error('❌ No file in upload request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📁 File upload details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      destination: req.file.destination,
      filename: req.file.filename,
      path: req.file.path
    });

    const user = req.user as any;
    if (!user?.id) {
      console.error('❌ No authenticated user');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('✅ Authenticated user:', user.id);

    const jobId = randomUUID();
    const userId = user.id;

    // Initialize processing job with persistent storage
    const job = await jobPersistence.createJob({
      id: jobId,
      userId,
      status: 'processing',
      progress: 0
    });

    console.log(`🎯 Created processing job: ${jobId}`);

    // Start async processing - pass original filename to help with detection
    processScheduleFile(jobId, req.file.path, userId, req.file.originalname).catch(async (error) => {
      console.error('❌ Processing error in async handler:', error);
      await jobPersistence.updateJob(jobId, {
        status: 'error',
        error: error.message
      });
      console.error(`❌ Job ${jobId} marked as error: ${error.message}`);
    });

    console.log(`✅ Upload successful, returning jobId: ${jobId}`);
    res.json({
      jobId,
      message: 'File uploaded successfully. Processing started.',
      status: 'processing'
    });

  } catch (error) {
    console.error('❌ Upload route error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

// Check processing status
router.get('/status/:jobId', isAuthenticated, async (req, res) => {
  const { jobId } = req.params;
  console.log(`🔍 Status endpoint called for job: ${jobId}`);
  
  const job = await jobPersistence.getJob(jobId);
  console.log(`🔍 DEBUG: Retrieved job:`, job ? {
    id: job.id,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    hasResult: !!job.result
  } : 'null');

  if (!job) {
    console.log(`❌ Job ${jobId} not found in persistent storage`);
    
    // Fallback: Check if PDF exists (job completed but not tracked)
    const pdfPath = path.join(process.cwd(), 'uploads', 'daily-reports', 'pdfs', `${jobId}.pdf`);
    try {
      await fs.access(pdfPath);
      console.log(`✅ Found completed PDF for job ${jobId} - creating recovery job record`);
      
      // Create a recovery job record
      await jobPersistence.createJob({
        id: jobId,
        userId: (req.user as any).id,
        status: 'completed',
        progress: 100,
        pdfPath: pdfPath
      });
      
      // Return completed status since PDF exists
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache', 
        'Expires': '0'
      });
      
      return res.json({
        jobId: jobId,
        status: 'completed',
        progress: 100,
        error: null,
        createdAt: new Date()
      });
    } catch {
      console.log(`❌ No PDF found for job ${jobId} - job truly not found`);
      return res.status(404).json({ error: 'Job not found' });
    }
  }

  const user = req.user as any;
  if (!user?.id || job.userId !== user.id) {
    console.log(`❌ Access denied for job ${jobId}: user=${user?.id}, jobUser=${job.userId}`);
    return res.status(403).json({ error: 'Access denied' });
  }

  console.log(`✅ Status request for job ${jobId}: status=${job.status}, progress=${job.progress}`);
  
  // Add cache-busting headers to prevent stale progress data
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    createdAt: job.createdAt
  });
});

// Download completed reports
router.get('/download/:jobId', isAuthenticated, async (req, res) => {
  try {
    const { jobId } = req.params;
    console.log(`🔍 Download request for job: ${jobId}`);
    
    const user = req.user as any;
    if (!user?.id) {
      console.log('❌ No authenticated user for download');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // PRODUCTION FIX: Check for PDF file directly on disk (job may be lost from memory)
    const pdfDir = 'uploads/daily-reports/pdfs';
    const pdfPath = path.join(pdfDir, `${jobId}.pdf`);
    
    console.log(`🔍 Checking for PDF file at: ${pdfPath}`);
    
    try {
      // Check if PDF file exists on disk
      const stats = await fs.stat(pdfPath);
      console.log(`✅ PDF file found: ${pdfPath} (${stats.size} bytes)`);
      
      // Read and send PDF file directly
      const fileBuffer = await fs.readFile(pdfPath);
      
      const filename = `daily-patient-reports-${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', stats.size.toString());
      
      console.log(`✅ Sending PDF file: ${filename} (${fileBuffer.length} bytes)`);
      res.send(fileBuffer);
      return;
      
    } catch (fileError) {
      console.log(`📁 PDF file not found on disk: ${pdfPath}`);
      console.log(`📁 File error details:`, fileError);
      
      // Fallback: Check persistent storage for job data
      const job = await jobPersistence.getJob(jobId);
      console.log(`🔍 Persistent storage check - Job ${jobId} exists: ${!!job}`);
      
      if (!job) {
        console.log(`❌ Job ${jobId} not found in persistent storage and no PDF on disk`);
        
        return res.status(404).json({ 
          error: 'Report not found',
          details: 'This report may have expired, been cleaned up, or failed to generate. Please try uploading your schedule again.',
          jobId: jobId,
          timestamp: new Date().toISOString()
        });
      }

      // Verify user access for persistent job
      if (job.userId !== user.id) {
        console.log(`❌ Access denied for job ${jobId}: user=${user.id}, jobUser=${job.userId}`);
        return res.status(403).json({ error: 'Access denied' });
      }

      if (job.status !== 'completed') {
        console.log(`⏳ Job ${jobId} not completed: ${job.status}`);
        return res.status(400).json({ error: 'Reports not ready yet' });
      }

      if (!job.result?.pdfPath && !job.pdfPath) {
        console.log(`❌ Job ${jobId} has no PDF path in result`);
        return res.status(404).json({ error: 'PDF file not found' });
      }

      // Try to read from job's stored path
      const pdfFilePath = job.pdfPath || job.result?.pdfPath;
      const jobFileBuffer = await fs.readFile(pdfFilePath);
      const filename = `daily-patient-reports-${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(jobFileBuffer);
      
      console.log(`✅ Sent PDF from job path: ${pdfFilePath}`);
    }

  } catch (error) {
    console.error('❌ Download error:', error);
    res.status(500).json({ 
      error: 'Download failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get processing results (for preview)
router.get('/results/:jobId', isAuthenticated, async (req, res) => {
  const { jobId } = req.params;
  const job = await jobPersistence.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const user = req.user as any;
  if (!user?.id || job.userId !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (job.status !== 'completed') {
    return res.status(400).json({ error: 'Processing not completed' });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    result: job.result
  });
});

async function processScheduleFile(jobId: string, filePath: string, userId: number, originalFilename?: string) {
  let job = await jobPersistence.getJob(jobId);
  if (!job) return;

  try {
    // Step 1: Parse schedule file (20% progress)
    job = await jobPersistence.updateJob(jobId, { progress: 20 });
    const scheduledPatients = await parseScheduleFile(filePath, originalFilename);
    
    // Step 2: Match patients (40% progress)
    const updateProgress = async (progress: number, status?: string) => {
      const updates: any = { progress };
      if (status) updates.status = status;
      
      await jobPersistence.updateJob(jobId, updates);
      console.log(`🔄 Progress updated to ${progress}% for job ${jobId}${status ? ` - ${status.toUpperCase()}` : ''}`);
    };

    await updateProgress(40);
    const matcher = new PatientMatcher(userId);
    const matchResults = await matcher.matchBatch(scheduledPatients);
    console.log(`🔄 Patient matching completed for job ${jobId}`);
    
    // Step 3: Generate reports (70% progress)
    updateProgress(70);
    const reportGenerator = new ReportGenerator(userId);
    
    console.log(`🔄 Starting report generation for ${matchResults.matches.length} patients`);
    
    const reportResults = await reportGenerator.generateBatchReports(matchResults.matches, (currentIndex, total) => {
      // Update progress from 70% to 85% based on completion
      const progressRange = 85 - 70; // 15% range
      const reportProgress = 70 + (currentIndex / total) * progressRange;
      const roundedProgress = Math.round(reportProgress);
      updateProgress(roundedProgress);
      console.log(`📊 Report generation progress: ${roundedProgress}% (${currentIndex}/${total} patients)`);
    });
    
    // Step 4: Generate PDF (90% progress)
    updateProgress(90);
    console.log('📄 Starting PDF generation...');
    const pdfPath = await generatePDF(reportResults, jobId);
    
    // Step 5: Verify PDF file exists before marking complete
    console.log(`🔍 Verifying PDF file exists: ${pdfPath}`);
    try {
      const pdfStats = await fs.stat(pdfPath);
      if (pdfStats.size < 1024) { // Less than 1KB indicates failure
        throw new Error(`PDF file too small: ${pdfStats.size} bytes`);
      }
      console.log(`✅ PDF verification successful: ${pdfStats.size} bytes`);
    } catch (verifyError) {
      console.error(`❌ PDF verification failed:`, verifyError);
      await jobPersistence.updateJob(jobId, {
        status: 'error',
        error: `PDF verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`
      });
      throw new Error(`PDF verification failed: ${verifyError instanceof Error ? verifyError.message : 'PDF file not found or corrupted'}`);
    }

    // Step 5: Complete (100% progress) - Only after PDF verification
    await updateProgress(100, 'completed');
    await jobPersistence.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      pdfPath,
      result: {
        matchSummary: matchResults.summary,
        reportSummary: reportResults.summary,
        pdfPath,
        reports: reportResults.reports.map(r => ({
          patient: r.patient,
          status: r.status
        })) // Don't include full chart data in API response
      }
    });

    // Cleanup uploaded file
    await fs.unlink(filePath);

  } catch (error) {
    console.error('Processing error:', error);
    await jobPersistence.updateJob(jobId, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Cleanup on error
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
}

async function parseScheduleFile(filePath: string, originalFilename?: string): Promise<ScheduledPatient[]> {
  console.log('📁 BYPASSING detectFileFields - Direct Excel parsing for Daily Reports');
  console.log('📄 File path:', filePath);
  console.log('📄 Original filename:', originalFilename);
  
  try {
    // Verify file exists first
    try {
      await fs.access(filePath);
      console.log('✅ File exists and is accessible');
    } catch (accessError) {
      console.error('❌ File access error:', accessError);
      throw new Error(`Cannot access uploaded file: ${accessError.message}`);
    }

    const fileExtension = originalFilename ? 
      path.extname(originalFilename).toLowerCase() : 
      path.extname(filePath).toLowerCase();
    
    console.log(`📄 Processing ${fileExtension} file directly`);
    
    let rawData: any[] = [];
    
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      // Direct Excel parsing with enhanced error handling
      console.log('📊 Direct Excel parsing (bypassing detectFileFields)');
      try {
        console.log('📊 Reading Excel workbook...');
        
        // Try to read the workbook with different options to handle corrupted files
        let workbook;
        try {
          workbook = XLSX.readFile(filePath, { 
            cellDates: true,
            cellNF: false,
            cellText: false
          });
        } catch (readError) {
          console.log('📊 Standard read failed, trying with recovery options...');
          workbook = XLSX.readFile(filePath, {
            raw: true,
            cellDates: false,
            cellNF: false,
            cellText: true
          });
        }
        
        console.log('📊 Workbook loaded, sheet names:', workbook.SheetNames);
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Excel file contains no worksheets. Please ensure your Excel file has at least one worksheet with data.');
        }
        
        const firstSheetName = workbook.SheetNames[0];
        console.log('📊 Processing sheet:', firstSheetName);
        const worksheet = workbook.Sheets[firstSheetName];
        
        if (!worksheet) {
          throw new Error(`Worksheet "${firstSheetName}" not found or is empty`);
        }
        
        // Check if worksheet has any content
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        if (range.e.r < 1) {
          throw new Error('Excel worksheet appears to have no data rows. Please ensure your file has headers in the first row and data in subsequent rows.');
        }
        
        // Parse with error handling for different scenarios
        try {
          rawData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            blankrows: false
          });
          
          // Convert array format to object format if we got headers
          if (rawData.length >= 2) {
            const headers = rawData[0] as string[];
            const dataRows = rawData.slice(1) as any[][];
            
            rawData = dataRows.map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                if (header && header.trim()) {
                  obj[header.trim()] = row[index] || '';
                }
              });
              return obj;
            }).filter(row => Object.values(row).some(val => val && String(val).trim()));
          } else {
            // Try object format parsing
            rawData = XLSX.utils.sheet_to_json(worksheet, {
              defval: '',
              blankrows: false
            });
          }
        } catch (parseError) {
          console.log('📊 Standard parsing failed, trying alternative approach...');
          rawData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: '',
            blankrows: false
          });
        }
        
        console.log(`📊 Excel parsed successfully: ${rawData.length} rows`);
        
        if (rawData.length === 0) {
          throw new Error('Excel file appears to be empty or has no data rows. Please ensure your Excel file contains patient data with headers in the first row.');
        }
        
        // Log sample of parsed data for debugging
        console.log('📊 Sample parsed data (first 2 rows):', JSON.stringify(rawData.slice(0, 2), null, 2));
        
      } catch (xlsxError) {
        console.error('❌ Excel parsing error:', xlsxError);
        if (xlsxError.message.includes('ENOENT') || xlsxError.message.includes('file not found')) {
          throw new Error('Excel file was not found or was deleted during processing. Please try uploading again.');
        } else if (xlsxError.message.includes('ZIP') || xlsxError.message.includes('Corrupt')) {
          throw new Error('Excel file appears to be corrupted or is not a valid Excel format. Please save your file as .xlsx and try again.');
        } else if (xlsxError.message.includes('password') || xlsxError.message.includes('encrypted')) {
          throw new Error('Excel file appears to be password protected. Please remove password protection and try again.');
        } else {
          throw new Error(`Excel file parsing failed: ${xlsxError.message}. Please ensure your file is a valid Excel (.xlsx or .xls) file with data.`);
        }
      }
    } else {
      // Direct CSV parsing with enhanced error handling
      console.log('📊 Direct CSV parsing (bypassing detectFileFields)');
      try {
        const csvContent = await fs.readFile(filePath, 'utf8');
        console.log(`📊 CSV file read: ${csvContent.length} characters`);
        
        if (csvContent.trim().length === 0) {
          throw new Error('CSV file is empty');
        }
        
        const { parse } = await import('csv-parse/sync');
        rawData = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
        console.log(`📊 CSV parsed successfully: ${rawData.length} rows`);
      } catch (csvError) {
        console.error('❌ CSV parsing error:', csvError);
        throw new Error(`CSV file parsing failed: ${csvError.message}. Please ensure your file is a valid CSV file.`);
      }
    }
    
    if (rawData.length === 0) {
      throw new Error('No data found in file');
    }
    
    // Direct field detection on parsed data
    const firstRow = rawData[0];
    const availableFields = Object.keys(firstRow);
    console.log('📄 Available fields:', availableFields);
    
    // Find patient_id field (flexible matching)
    const patientIdField = availableFields.find(field => {
      const lower = field.toLowerCase();
      return lower.includes('patient_id') || 
             lower.includes('patientid') ||
             lower === 'patient id' ||
             lower === 'id';
    });
    
    // Find patient_name field (flexible matching)
    const patientNameField = availableFields.find(field => {
      const lower = field.toLowerCase();
      return lower.includes('patient_name') || 
             lower.includes('patientname') ||
             lower === 'patient name' ||
             lower === 'name' ||
             lower.includes('full_name') ||
             lower.includes('fullname');
    });
    
    console.log('🔍 Field mapping:', { patientIdField, patientNameField });
    
    if (!patientIdField) {
      throw new Error(`Required field "patient_id" not found. Available fields: ${availableFields.join(', ')}`);
    }
    
    if (!patientNameField) {
      throw new Error(`Required field "patient_name" not found. Available fields: ${availableFields.join(', ')}`);
    }
    
    // Convert to ScheduledPatient format
    const patients: ScheduledPatient[] = [];
    
    for (const row of rawData) {
      const patientId = row[patientIdField];
      const patientName = row[patientNameField];
      
      if (patientId && patientName) {
        const patient: ScheduledPatient = {
          patient_id: String(patientId).trim(),
          patient_name: String(patientName).trim(),
          ...row // Preserve all additional fields
        };
        patients.push(patient);
      }
    }
    
    // Get unique patients only (deduplicate by patient_id)
    const uniquePatients = patients.filter((patient, index, array) => {
      return array.findIndex(p => p.patient_id === patient.patient_id) === index;
    });
    
    console.log(`✅ Successfully parsed ${uniquePatients.length} UNIQUE patients from ${rawData.length} total rows`);
    console.log(`📊 Breakdown: ${rawData.length} rows → ${patients.length} patient records → ${uniquePatients.length} unique patients`);
    
    // DEBUG: Show first few unique patients
    console.log('🔍 DEBUG: First 3 unique patients:');
    uniquePatients.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i+1}. ID: "${p.patient_id}", Name: "${p.patient_name}"`);
    });
    
    return uniquePatients;
    
  } catch (error) {
    console.error('🚨 Direct parsing failed:', error);
    throw new Error(`File parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function generatePDF(reportResults: any, jobId: string): Promise<string> {
  const jsPDF = (await import('jspdf')).jsPDF;
  
  const pdfDir = 'uploads/daily-reports/pdfs';
  await fs.mkdir(pdfDir, { recursive: true });
  const pdfPath = path.join(pdfDir, `${jobId}.pdf`);
  
  try {
    // Create new PDF document in landscape for better chart visibility
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    const reports = reportResults.reports || [];
    console.log(`🔍 PDF DEBUG: Processing ${reports.length} reports for PDF generation`);
    
    // Sort patients by chart number (patient_id) - REQUIREMENT #2
    const sortedReports = reports.sort((a: any, b: any) => {
      const aId = parseInt(a.patient?.patient_id) || 0;
      const bId = parseInt(b.patient?.patient_id) || 0;
      return aId - bId;
    });
    
    // REQUIREMENT #1: TITLE PAGE with comprehensive info
    doc.setFontSize(24);
    doc.text('Daily Patient Reports', 20, 40);
    
    doc.setFontSize(14);
    doc.text(`Report Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, 60);
    doc.text(`Requested by User ID: ${reportResults.userId || reportResults.summary?.userId || 'Unknown'}`, 20, 70);
    
    doc.setFontSize(12);
    doc.text(`Total Patients in Schedule: ${sortedReports.length}`, 20, 90);
    
    const processedCount = sortedReports.filter((r: any) => r.status === 'found' || r.status === 'success').length;
    const errorCount = sortedReports.filter((r: any) => r.status === 'not_found' || r.status === 'error').length;
    
    doc.text(`Patients Successfully Processed: ${processedCount}`, 20, 100);
    doc.text(`Patients Not Found in Database: ${errorCount}`, 20, 110);
    doc.text(`Processing Status: Complete`, 20, 120);
    doc.text(`Errors Encountered: ${reportResults.errors?.length || 0}`, 20, 130);
    
    if (reportResults.processingTime) {
      doc.text(`Processing Time: ${reportResults.processingTime}`, 20, 140);
    }
    
    // Process each patient (sorted by chart number) - REQUIREMENT #2
    for (let i = 0; i < sortedReports.length; i++) {
      const report = sortedReports[i];
      const patient = report.patient;
      
      if (!patient) continue;
      
      // NEW PAGE for each patient - REQUIREMENT #1
      doc.addPage();
      
      // REQUIREMENT #3: Patient identification on ALL pages
      doc.setFontSize(16);
      doc.text(`Chart #${patient.patient_id} - ${patient.patient_name}`, 20, 15);
      
      // REQUIREMENT #4: SUMMARY DATA ONLY - NO INTERPRETATION
      doc.setFontSize(12);
      let currentY = 30;
      
      console.log(`🔍 PDF DEBUG: Patient ${patient.patient_id} - Status: ${report.status}, Has Summary: ${!!report.narrativeSummary}`);
      
      if ((report.status === 'found' || report.status === 'success') && report.narrativeSummary) {
        doc.text('Patient Summary:', 20, currentY);
        currentY += 8;
        
        // Split summary into manageable chunks with FULL EXTENDED width for landscape mode - RAW DATA ONLY
        const summaryLines = doc.splitTextToSize(report.narrativeSummary, 270);
        doc.setFontSize(9);
        doc.text(summaryLines, 20, currentY, { lineHeightFactor: 1.2 });
        
      } else {
        doc.setFontSize(10);
        doc.text('No clinical data found for this patient in the database.', 20, currentY);
      }
      
      // REQUIREMENT #4: PAGE BREAK before charts - continue landscape orientation
      doc.addPage(); // Already in landscape mode
      
      // REQUIREMENT #3: Patient identification on charts page  
      doc.setFontSize(16);
      doc.text(`Medical Chart Analysis - ${patient.patient_name} (ID: ${patient.patient_id})`, 20, 15);
      
      // REQUIREMENT #5: Display 4 bubble charts with full space for symptom labels
      doc.setFontSize(14);
      doc.text('Clinical Data Visualizations', 20, 25);
      // Add line break after title
      doc.text('', 20, 32);
      
      // MEDICAL-GRADE BUBBLE CHARTS - 1/4 page per chart for optimal Y-axis label visibility
      doc.setFontSize(10);
      
      if (report.chartImages) {
        try {
          // Embed medical bubble charts with FULL SPACE for Y-axis symptom names
          console.log('🎯 Embedding chart images for patient:', report.patient.patient_id);
          
          // TRUE LANDSCAPE LAYOUT: 2x2 grid using 1/4 page per chart (A4 landscape = 297x210mm)  
          const charts = [
            { name: 'Symptoms Over Time', data: report.chartImages.symptoms, x: 8, y: 40, width: 142, height: 78 },
            { name: 'Diagnoses Timeline', data: report.chartImages.diagnoses, x: 155, y: 40, width: 142, height: 78 },
            { name: 'HRSN Issues', data: report.chartImages.hrsn, x: 8, y: 125, width: 142, height: 78 },
            { name: 'Diagnostic Categories', data: report.chartImages.categories, x: 155, y: 125, width: 142, height: 78 }
          ];
          
          let successfulEmbeds = 0;
          
          for (const chart of charts) {
            try {
              // Add chart title with medical context
              doc.setFontSize(10);
              doc.text(chart.name, chart.x, chart.y - 5);
              
              // Validate image data (be more lenient for medical data)
              if (!chart.data || chart.data.length < 500) {
                console.error(`❌ ${chart.name} chart too small: ${chart.data?.length || 0} bytes`);
                // Draw medical-style placeholder with landscape dimensions
                doc.rect(chart.x, chart.y, chart.width, chart.height);
                doc.setFontSize(8);
                doc.text('No data available', chart.x + chart.width/2, chart.y + chart.height/2, { align: 'center' });
                continue;
              }
              
              // Embed medical chart with LANDSCAPE SPACE for full Y-axis symptom names
              doc.addImage(chart.data, 'PNG', chart.x, chart.y, chart.width, chart.height);
              console.log(`✅ Successfully embedded ${chart.name} chart (${chart.data.length} bytes)`);
              successfulEmbeds++;
              
            } catch (embedError) {
              console.error(`❌ Failed to embed ${chart.name} chart:`, embedError);
              // Draw medical error indicator with landscape space
              doc.rect(chart.x, chart.y, chart.width, chart.height);
              doc.setFontSize(8);
              doc.text('Display Error', chart.x + chart.width/2, chart.y + chart.height/2, { align: 'center' });
            }
          }
          
          console.log(`✅ Successfully embedded ${successfulEmbeds}/4 bubble charts`);
          
        } catch (imageError) {
            console.error('Error embedding bubble charts:', imageError);
            
            // Fallback to error indicators if chart embedding fails
            doc.rect(20, 45, 80, 60);
            doc.setFontSize(10);
            doc.text('Chart Error', 60, 75, { align: 'center' });
            
            doc.rect(105, 45, 80, 60);
            doc.text('Chart Error', 145, 75, { align: 'center' });
            
            doc.rect(20, 110, 80, 60);
            doc.text('Chart Error', 60, 140, { align: 'center' });
            
            doc.rect(105, 110, 80, 60);
            doc.text('Chart Error', 145, 140, { align: 'center' });
        }
      } else {
        // Fallback for missing chart images
        doc.rect(20, 45, 80, 60);
        doc.text('Symptoms Chart - No data available', 22, 75);
        
        doc.rect(105, 45, 80, 60);
        doc.text('Diagnoses Chart - No data available', 107, 75);
        
        doc.rect(20, 110, 80, 60);
        doc.text('HRSN Chart - No data available', 22, 140);
        
        doc.rect(105, 110, 80, 60);
        doc.text('Categories Chart - No data available', 107, 140);
      }
      
      // REQUIREMENT #6: Page break before next patient (handled by loop)
    }
    
    // Save PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    await fs.writeFile(pdfPath, pdfBuffer);
    
    console.log(`✅ PDF generated successfully: ${pdfPath}`);
    return pdfPath;
    
  } catch (error) {
    console.error('PDF generation error:', error);
    // Fallback: create a simple text file
    const fallbackContent = `Daily Patient Reports\nGenerated: ${new Date().toISOString()}\n\nReports: ${JSON.stringify(reportResults, null, 2)}`;
    await fs.writeFile(pdfPath.replace('.pdf', '.txt'), fallbackContent);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Debug endpoint to list current jobs and PDFs (admin only)
router.get('/debug/status', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    
    // Get persistent jobs for current user
    const userJobs = await jobPersistence.getJobsByUser(user.id);
    const persistentJobs = userJobs.map(job => ({
      id: job.id,
      status: job.status,
      progress: job.progress,
      userId: job.userId,
      createdAt: job.createdAt,
      error: job.error,
      hasPdfPath: !!(job.result?.pdfPath || job.pdfPath)
    }));

    // Get disk PDFs
    const pdfDir = 'uploads/daily-reports/pdfs';
    let diskPdfs: any[] = [];
    try {
      const files = await fs.readdir(pdfDir);
      diskPdfs = await Promise.all(
        files.filter(f => f.endsWith('.pdf')).map(async (filename) => {
          try {
            const filePath = path.join(pdfDir, filename);
            const stats = await fs.stat(filePath);
            return {
              filename,
              jobId: filename.replace('.pdf', ''),
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime,
              ageHours: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60))
            };
          } catch {
            return null;
          }
        })
      );
      diskPdfs = diskPdfs.filter(Boolean);
    } catch {
      // Directory doesn't exist
    }

    res.json({
      timestamp: new Date().toISOString(),
      persistentJobs: persistentJobs.length,
      diskPdfs: diskPdfs.length,
      details: {
        persistentJobs,
        diskPdfs: diskPdfs.sort((a, b) => b.modified.getTime() - a.modified.getTime())
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Debug status failed', details: error });
  }
});

export { router as dailyReportsRouter };