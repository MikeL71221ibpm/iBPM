// Test endpoint to verify download functionality works with persistent storage
// This simulates the production scenario where jobs exist as PDFs but not in memory

import express from 'express';
import { jobPersistence } from '../services/job-persistence';
import path from 'path';
import fs from 'fs/promises';

const testRouter = express.Router();

// Test endpoint to create a recovery job for an existing PDF
testRouter.post('/create-recovery-job', async (req, res) => {
  try {
    const { pdfFilename, userId = 4 } = req.body;
    
    if (!pdfFilename) {
      return res.status(400).json({ error: 'pdfFilename required' });
    }
    
    const jobId = pdfFilename.replace('.pdf', '');
    const pdfPath = path.join(process.cwd(), 'uploads', 'daily-reports', 'pdfs', pdfFilename);
    
    // Check if PDF exists
    try {
      const stats = await fs.stat(pdfPath);
      console.log(`✅ Found PDF: ${pdfFilename} (${stats.size} bytes)`);
    } catch {
      return res.status(404).json({ error: 'PDF file not found' });
    }
    
    // Create recovery job
    const job = await jobPersistence.createJob({
      id: jobId,
      userId,
      status: 'completed',
      progress: 100,
      pdfPath,
      result: {
        pdfPath,
        recoveryJob: true,
        message: 'Recovery job created for existing PDF'
      }
    });
    
    res.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        pdfPath: job.pdfPath,
        downloadUrl: `/api/daily-reports/download/${job.id}`
      }
    });
    
  } catch (error) {
    console.error('Recovery job creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List available PDFs that could be recovered
testRouter.get('/available-pdfs', async (req, res) => {
  try {
    const pdfDir = 'uploads/daily-reports/pdfs';
    const files = await fs.readdir(pdfDir);
    const pdfs = files.filter(f => f.endsWith('.pdf')).slice(0, 10); // First 10 for testing
    
    const pdfDetails = await Promise.all(
      pdfs.map(async (filename) => {
        try {
          const filePath = path.join(pdfDir, filename);
          const stats = await fs.stat(filePath);
          const jobId = filename.replace('.pdf', '');
          const existingJob = await jobPersistence.getJob(jobId);
          
          return {
            filename,
            jobId,
            size: stats.size,
            created: stats.birthtime,
            hasJob: !!existingJob,
            downloadUrl: `/api/daily-reports/download/${jobId}`
          };
        } catch {
          return null;
        }
      })
    );
    
    res.json({
      availablePdfs: pdfDetails.filter(Boolean),
      totalPdfs: files.filter(f => f.endsWith('.pdf')).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export { testRouter };