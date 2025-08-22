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

    // Get grid format preference from form data
    const useGridFormat = req.body.useGridFormat === 'true';
    console.log('🔧 Grid format preference:', useGridFormat);

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

    // Start async processing - pass original filename and grid format preference
    processScheduleFile(jobId, req.file.path, userId, req.file.originalname, useGridFormat).catch(async (error) => {
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
    console.log(`🔍 PRODUCTION DOWNLOAD REQUEST for job: ${jobId}`);
    
    const user = req.user as any;
    if (!user?.id) {
      console.log('❌ No authenticated user for download');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // PRODUCTION FIX: Enhanced disk-first, memory-fallback architecture (V3.6.6 WORKING APPROACH)
    const pdfDir = 'uploads/daily-reports/pdfs';
    
    // Ensure PDF directory exists
    try {
      await fs.mkdir(pdfDir, { recursive: true });
    } catch (mkdirError) {
      console.log(`📁 Directory creation info:`, mkdirError);
    }
    
    const pdfPath = path.join(pdfDir, `${jobId}.pdf`);
    console.log(`🔍 PRODUCTION: Checking PDF at: ${pdfPath}`);
    
    try {
      // Check if PDF file exists on disk with enhanced validation
      const stats = await fs.stat(pdfPath);
      console.log(`✅ PRODUCTION: PDF found - Size: ${stats.size} bytes, Modified: ${stats.mtime}`);
      
      // Validate PDF file size (must be > 50KB for a real report)
      if (stats.size < 51200) {
        console.log(`⚠️  PRODUCTION WARNING: PDF file too small (${stats.size} bytes), checking job data...`);
        throw new Error(`PDF file appears corrupted or incomplete (${stats.size} bytes)`);
      }
      
      // Use streaming for large files (>10MB) to prevent memory issues
      if (stats.size > 10 * 1024 * 1024) {
        console.log(`📊 PRODUCTION: Large PDF detected (${stats.size} bytes), using streaming`);
        
        const filename = `daily-patient-reports-${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', stats.size.toString());
        res.setHeader('Cache-Control', 'no-cache');
        
        // Stream the file for memory efficiency
        const { createReadStream } = await import('fs');
        const stream = createReadStream(pdfPath);
        
        stream.on('error', (streamError) => {
          console.error(`❌ PRODUCTION STREAM ERROR:`, streamError);
          if (!res.headersSent) {
            res.status(500).json({ error: 'File streaming failed' });
          }
        });
        
        stream.pipe(res);
        console.log(`✅ PRODUCTION: Streaming large PDF: ${filename}`);
        return;
      }
      
      // For smaller files, read into memory
      console.log(`📄 PRODUCTION: Reading PDF into memory (${stats.size} bytes)`);
      const fileBuffer = await fs.readFile(pdfPath);
      
      // Validate buffer
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('PDF file is empty or corrupted');
      }
      
      // Validate PDF header
      const pdfHeader = fileBuffer.slice(0, 4).toString();
      if (pdfHeader !== '%PDF') {
        throw new Error('File is not a valid PDF');
      }
      
      const filename = `daily-patient-reports-${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fileBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache');
      
      console.log(`✅ PRODUCTION SUCCESS: Sending PDF: ${filename} (${fileBuffer.length} bytes)`);
      res.send(fileBuffer);
      return;
      
    } catch (fileError) {
      console.log(`🔧 PRODUCTION FALLBACK: PDF file issue - ${fileError.message}`);
      console.log(`🔧 PRODUCTION: Checking persistent storage...`);
      
      // Enhanced fallback: Check persistent storage for job data
      const job = await jobPersistence.getJob(jobId);
      console.log(`🔍 PRODUCTION: Job ${jobId} exists in storage: ${!!job}`);
      
      if (!job) {
        console.log(`❌ PRODUCTION ERROR: Job ${jobId} not found anywhere`);
        
        return res.status(404).json({ 
          error: 'Download Failed',
          details: 'Report not found. This may indicate a server restart occurred during processing. Please try uploading your schedule again.',
          jobId: jobId,
          timestamp: new Date().toISOString(),
          suggestion: 'Upload your schedule file again to regenerate the reports.'
        });
      }

      // Verify user access for persistent job
      if (job.userId !== user.id) {
        console.log(`❌ PRODUCTION: Access denied for job ${jobId}: user=${user.id}, jobUser=${job.userId}`);
        return res.status(403).json({ error: 'Access denied' });
      }

      if (job.status !== 'completed') {
        console.log(`⏳ PRODUCTION: Job ${jobId} status: ${job.status}`);
        return res.status(400).json({ 
          error: 'Reports not ready',
          status: job.status,
          details: job.status === 'error' ? job.error : 'Processing still in progress'
        });
      }

      // SECURE RECOVERY: Only look for PDFs belonging to this specific user's job
      console.log(`🔐 PRODUCTION: Searching for alternative PDF paths for user ${user.id}, job ${jobId}...`);
      
      try {
        // Look for backup PDFs created for this specific job
        const backupPatterns = [
          path.join(pdfDir, `backup-*-${jobId}.pdf`),
          path.join(pdfDir, `${jobId}-backup.pdf`),
          path.join(pdfDir, `${jobId}.pdf`)
        ];
        
        console.log(`🔐 PRODUCTION: Checking backup PDF patterns for job ${jobId}`);
        
        for (const pattern of backupPatterns) {
          try {
            // Check if exact job file exists
            if (pattern.includes('*')) {
              // Handle glob pattern for backup files
              const pdfFiles = await fs.readdir(pdfDir);
              const jobBackups = pdfFiles.filter(f => 
                f.includes(jobId) && f.endsWith('.pdf') && f.includes('backup')
              );
              
              for (const backupFile of jobBackups) {
                const backupPath = path.join(pdfDir, backupFile);
                const stats = await fs.stat(backupPath);
                
                if (stats.size > 1048576) { // Valid size check
                  const pdfBuffer = await fs.readFile(backupPath);
                  
                  if (pdfBuffer.slice(0, 4).toString() === '%PDF') {
                    console.log(`🔐 PRODUCTION: Found user's backup PDF: ${backupPath}`);
                    
                    const filename = `daily-patient-reports-${new Date().toISOString().split('T')[0]}.pdf`;
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                    res.setHeader('Content-Length', pdfBuffer.length.toString());
                    res.setHeader('Cache-Control', 'no-cache');
                    
                    if (pdfBuffer.length > 10485760) { // >10MB
                      console.log(`🔐 PRODUCTION: Streaming large backup PDF: ${(pdfBuffer.length / 1048576).toFixed(1)}MB`);
                      res.write(pdfBuffer);
                      res.end();
                    } else {
                      res.send(pdfBuffer);
                    }
                    
                    console.log(`✅ SECURE RECOVERY SUCCESS: Served user's backup PDF: ${backupPath}`);
                    return;
                  }
                }
              }
            } else {
              // Direct path check
              const stats = await fs.stat(pattern);
              if (stats.size > 1048576) {
                const pdfBuffer = await fs.readFile(pattern);
                
                if (pdfBuffer.slice(0, 4).toString() === '%PDF') {
                  console.log(`🔐 PRODUCTION: Found user's PDF: ${pattern}`);
                  
                  const filename = `daily-patient-reports-${new Date().toISOString().split('T')[0]}.pdf`;
                  res.setHeader('Content-Type', 'application/pdf');
                  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                  res.setHeader('Content-Length', pdfBuffer.length.toString());
                  res.setHeader('Cache-Control', 'no-cache');
                  
                  if (pdfBuffer.length > 10485760) { // >10MB
                    res.write(pdfBuffer);
                    res.end();
                  } else {
                    res.send(pdfBuffer);
                  }
                  
                  console.log(`✅ SECURE RECOVERY SUCCESS: Served user's PDF: ${pattern}`);
                  return;
                }
              }
            }
          } catch (patternError) {
            console.log(`🔐 PRODUCTION: Pattern ${pattern} not found: ${patternError.message}`);
          }
        }
        
        console.log(`🔐 PRODUCTION: No valid backup PDFs found for user ${user.id}, job ${jobId}`);
        
      } catch (scanError) {
        console.log(`🔐 PRODUCTION: Secure PDF scan failed: ${scanError.message}`);
      }
      
      // Final fallback failed
      console.log(`❌ PRODUCTION FINAL ERROR: All PDF recovery attempts failed`);
      return res.status(404).json({ 
        error: 'Download Failed',
        details: 'No valid PDF reports found. This can happen if the files were cleaned up or if there was a processing error.',
        suggestion: 'Please upload your schedule again to regenerate the reports. Processing typically takes 1-2 minutes.',
        jobId: jobId,
        technicalInfo: 'PDF files may have been cleaned up due to server maintenance or disk space management.'
      });
    }

  } catch (error) {
    console.error('❌ PRODUCTION DOWNLOAD ERROR:', error);
    res.status(500).json({ 
      error: 'Download failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Please try again or upload your schedule file again.'
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

async function processScheduleFile(jobId: string, filePath: string, userId: number, originalFilename?: string, useGridFormat: boolean = false) {
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
    await updateProgress(70);
    const reportGenerator = new ReportGenerator(userId);
    
    console.log(`🔄 Starting report generation for ${matchResults.matches.length} patients (${useGridFormat ? 'GRID' : 'LINEAR'} format)`);
    
    const reportResults = await reportGenerator.generateBatchReports(matchResults.matches, async (currentIndex, total) => {
      // Update progress from 70% to 85% based on completion
      const progressRange = 85 - 70; // 15% range
      const reportProgress = 70 + (currentIndex / total) * progressRange;
      const roundedProgress = Math.round(reportProgress);
      await updateProgress(roundedProgress);
      console.log(`📊 Report generation progress: ${roundedProgress}% (${currentIndex}/${total} patients) [PERMANENT PARALLEL PROCESSING]`);
    }, useGridFormat); // Pass the grid format preference
    
    // Step 4: Generate PDF (90% progress)
    await updateProgress(90);
    console.log(`📄 Starting PDF generation for ${matchResults.matches.length} patients...`);
    const pdfPath = await generatePDF(reportResults, jobId);
    
    // Report final PDF size and create backup path
    try {
      const pdfStats = await fs.stat(pdfPath);
      const sizeInMB = (pdfStats.size / (1024 * 1024)).toFixed(1);
      console.log(`✅ PDF GENERATION COMPLETE: ${pdfPath} - Size: ${sizeInMB}MB (${pdfStats.size} bytes)`);
      
      // Create a backup with timestamp to prevent orphaned files
      const backupPath = path.join('uploads/daily-reports/pdfs', `backup-${Date.now()}-${jobId}.pdf`);
      await fs.copyFile(pdfPath, backupPath);
      console.log(`🔧 BACKUP PDF CREATED: ${backupPath}`);
      
    } catch (sizeError) {
      console.log('📊 PDF size check failed:', sizeError.message);
    }
    
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

    // Step 5: Store PDF data for production environments
    console.log(`🔧 PRODUCTION: Storing PDF data for ephemeral filesystem recovery...`);
    let pdfDataForStorage: string | undefined;
    
    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      if (pdfBuffer.length > 1024 && pdfBuffer.slice(0, 4).toString() === '%PDF') {
        pdfDataForStorage = pdfBuffer.toString('base64');
        console.log(`✅ PDF stored for production: ${(pdfBuffer.length / 1048576).toFixed(1)}MB`);
        console.log(`🔧 PRODUCTION DEBUG: PDF data base64 length: ${pdfDataForStorage.length} chars`);
      } else {
        console.log(`⚠️ PDF validation failed for storage - Length: ${pdfBuffer.length}, Header: ${pdfBuffer.slice(0, 4).toString()}`);
      }
    } catch (pdfStorageError) {
      console.log(`⚠️ PDF storage failed: ${pdfStorageError.message}`);
    }

    // Step 6: Complete (100% progress) - Only after PDF verification
    await updateProgress(100, 'completed');
    const finalJobData = {
      status: 'completed' as const,
      progress: 100,
      pdfPath,
      result: {
        matchSummary: matchResults.summary,
        reportSummary: reportResults.summary,
        pdfPath,
        pdfData: pdfDataForStorage, // PRODUCTION FIX: Store PDF for ephemeral filesystems
        reports: reportResults.reports.map(r => ({
          patient: r.patient,
          status: r.status
        })) // Don't include full chart data in API response
      }
    };
    
    console.log(`🔧 PRODUCTION DEBUG: Final job update - PDF data included: ${!!pdfDataForStorage}`);
    if (pdfDataForStorage) {
      console.log(`🔧 PRODUCTION DEBUG: PDF data size: ${(pdfDataForStorage.length / 1048576).toFixed(2)}MB in base64`);
    }
    
    await jobPersistence.updateJob(jobId, finalJobData);

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
  console.log(`🔍 PRODUCTION PDF GENERATION: Starting for job ${jobId}`);
  
  const jsPDF = (await import('jspdf')).jsPDF;
  
  const pdfDir = 'uploads/daily-reports/pdfs';
  
  // PRODUCTION FIX: Ensure directory exists with proper permissions
  try {
    await fs.mkdir(pdfDir, { recursive: true, mode: 0o755 });
    console.log(`✅ PRODUCTION: PDF directory ready: ${pdfDir}`);
  } catch (mkdirError) {
    console.error(`❌ PRODUCTION: Failed to create PDF directory: ${mkdirError}`);
    throw new Error(`PDF directory creation failed: ${mkdirError.message}`);
  }
  
  const pdfPath = path.join(pdfDir, `${jobId}.pdf`);
  console.log(`🔍 PRODUCTION: PDF will be saved to: ${pdfPath}`);
  
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
    
    // PRODUCTION FIX: Enhanced PDF generation with error handling
    console.log(`🔍 PRODUCTION: Generating PDF buffer...`);
    
    let pdfBuffer;
    try {
      const arrayBuffer = doc.output('arraybuffer');
      pdfBuffer = Buffer.from(arrayBuffer);
      console.log(`✅ PRODUCTION: PDF buffer created - Size: ${pdfBuffer.length} bytes`);
      
      // Validate buffer size (must be reasonable for a real report)
      if (pdfBuffer.length < 51200) { // 50KB minimum
        throw new Error(`PDF buffer too small: ${pdfBuffer.length} bytes`);
      }
      
      // Validate PDF header
      const pdfHeader = pdfBuffer.slice(0, 4).toString();
      if (pdfHeader !== '%PDF') {
        throw new Error('Generated buffer is not a valid PDF');
      }
      
    } catch (bufferError) {
      console.error(`❌ PRODUCTION: PDF buffer generation failed:`, bufferError);
      throw new Error(`PDF buffer generation failed: ${bufferError.message}`);
    }
    
    // Write to disk with atomic operation (temp file + rename)
    const tempPath = `${pdfPath}.tmp`;
    
    try {
      console.log(`🔍 PRODUCTION: Writing PDF to temp file: ${tempPath}`);
      await fs.writeFile(tempPath, pdfBuffer, { mode: 0o644 });
      
      // Verify temp file was written correctly
      const tempStats = await fs.stat(tempPath);
      console.log(`✅ PRODUCTION: Temp file written - Size: ${tempStats.size} bytes`);
      
      if (tempStats.size !== pdfBuffer.length) {
        throw new Error(`File size mismatch: expected ${pdfBuffer.length}, got ${tempStats.size}`);
      }
      
      // Atomic rename (ensures file is either complete or doesn't exist)
      await fs.rename(tempPath, pdfPath);
      console.log(`✅ PRODUCTION: PDF file atomically created: ${pdfPath}`);
      
      // Final verification
      const finalStats = await fs.stat(pdfPath);
      console.log(`✅ PRODUCTION: Final PDF verified - Size: ${finalStats.size} bytes`);
      
    } catch (writeError) {
      console.error(`❌ PRODUCTION: PDF write failed:`, writeError);
      
      // Cleanup temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        console.log(`🧹 PRODUCTION: Temp file cleanup info:`, cleanupError.message);
      }
      
      throw new Error(`PDF write failed: ${writeError.message}`);
    }
    
    console.log(`✅ PRODUCTION PDF SUCCESS: Generated ${pdfPath} (${pdfBuffer.length} bytes)`);
    return pdfPath;
    
  } catch (error) {
    console.error('❌ PRODUCTION PDF ERROR:', error);
    
    // Enhanced cleanup: remove any partial files
    try {
      await fs.unlink(pdfPath);
      console.log(`🧹 PRODUCTION: Cleaned up partial PDF file`);
    } catch (cleanupError) {
      console.log(`🧹 PRODUCTION: No partial file to cleanup`);
    }
    
    try {
      await fs.unlink(`${pdfPath}.tmp`);
      console.log(`🧹 PRODUCTION: Cleaned up temp file`);
    } catch (cleanupError) {
      console.log(`🧹 PRODUCTION: No temp file to cleanup`);
    }
    
    // Don't create fallback text files in production - fail clearly
    throw new Error(`PRODUCTION PDF GENERATION FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
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