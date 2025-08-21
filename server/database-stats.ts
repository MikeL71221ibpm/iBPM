import { Request, Response } from 'express';
import { DatabaseStorage } from './database-storage';

const storage = new DatabaseStorage();

export const getDatabaseStats = async (req: Request, res: Response) => {
  try {
    // Set headers to prevent caching for real-time data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Get user ID from authenticated user - require authentication
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "Please log in to access database statistics"
      });
    }
    
    // Use direct SQL for fast queries to avoid method errors
    const patientCountResult = await storage.executeRawQuery('SELECT COUNT(*) as count FROM patients WHERE user_id = $1', [userId]);
    const noteCountResult = await storage.executeRawQuery('SELECT COUNT(*) as count FROM notes WHERE user_id = $1', [userId]);
    const symptomCountResult = await storage.executeRawQuery('SELECT COUNT(*) as count FROM extracted_symptoms WHERE user_id = $1', [userId]);
    
    const patientCount = parseInt(patientCountResult.rows[0]?.count || '0');
    const noteCount = parseInt(noteCountResult.rows[0]?.count || '0');
    const symptomCount = parseInt(symptomCountResult.rows[0]?.count || '0');
    
    // Get actual processed notes count - when symptoms exist, all notes were processed
    let processedNotesCount = 0;
    try {
      if (symptomCount > 0) {
        // If we have symptoms, all notes were processed during extraction
        processedNotesCount = noteCount;
      } else {
        // Only count patients with symptoms if no extraction has occurred
        const result = await storage.executeRawQuery(
          `SELECT COUNT(DISTINCT n.patient_id) as count 
           FROM notes n 
           INNER JOIN extracted_symptoms es ON n.patient_id = es.patient_id 
           WHERE n.user_id = $1 AND es.user_id = $1`,
          [userId]
        );
        processedNotesCount = parseInt(result.rows[0]?.count || '0', 10);
      }
    } catch (error) {
      console.log('Error getting processed notes count:', error);
    }

    // Get processing status
    let processingStatus = null;
    try {
      const statusResult = await storage.executeRawQuery(
        'SELECT * FROM processing_status WHERE user_id = $1 ORDER BY last_update_time DESC LIMIT 1',
        [userId]
      );
      
      if (statusResult.rows.length > 0) {
        const row = statusResult.rows[0];
        processingStatus = {
          status: row.status,
          progress: row.progress,
          message: row.message,
          updatedAt: row.last_update_time,
          startTime: row.start_time,
          endTime: row.end_time,
          processType: row.process_type
        };
      }
    } catch (error) {
      console.log('Error getting processing status:', error);
    }

    // Get last uploaded file
    let lastFile = null;
    try {
      const fileResult = await storage.executeRawQuery(
        'SELECT file_name, upload_date FROM file_uploads WHERE user_id = $1 ORDER BY upload_date DESC LIMIT 1',
        [userId]
      );
      
      if (fileResult.rows.length > 0) {
        const row = fileResult.rows[0];
        lastFile = {
          filename: row.file_name,
          uploadedAt: row.upload_date
        };
      }
    } catch (error) {
      console.log('Error getting last file:', error);
    }

    const responseData = {
      patientCount,
      noteCount,
      symptomCount,
      processedNotesCount,
      lastFile,
      processingStatus
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};