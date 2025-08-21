
/**
 * Emergency Endpoints - No Authentication Required
 * Standalone emergency endpoints for system recovery
 */

import { pool } from './db.js';

export function addEmergencyEndpoints(app) {
  // Emergency restart - Available to any user
  app.post('/api/emergency-restart-direct', async (req, res) => {
    try {
      // Use authenticated user ID, or fallback to User ID 4 if no authentication
      const userId = req.user?.id || 4;
      console.log(`🚨 Emergency restart initiated for User ID: ${userId}`);
      
      // Clear all user data
      await pool.query("DELETE FROM extracted_symptoms WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM notes WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM patients WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM processing_status WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM file_uploads WHERE user_id = $1", [userId]);
      
      console.log(`✅ Emergency restart completed for User ID: ${userId}`);
      
      res.json({
        success: true,
        message: `Emergency reset completed successfully`,
        userId: userId,
        clearedData: {
          patients: "cleared",
          notes: "cleared", 
          symptoms: "cleared",
          uploads: "cleared"
        }
      });
      
    } catch (error) {
      console.error('Emergency restart error:', error);
      res.status(500).json({ 
        error: "Emergency restart failed",
        message: "Database operation failed. Please try again or contact support.",
        details: error.message 
      });
    }
  });
  
  // Emergency reset bypass - No authentication required
  app.post('/api/emergency-reset-bypass', async (req, res) => {
    try {
      // Use authenticated user ID, or fallback to User ID 4 if no authentication
      const userId = req.user?.id || 4;
      console.log(`🚨 Emergency reset bypass initiated for User ID: ${userId}`);
      
      // Clear all user data
      await pool.query("DELETE FROM extracted_symptoms WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM notes WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM patients WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM processing_status WHERE user_id = $1", [userId]);
      await pool.query("DELETE FROM file_uploads WHERE user_id = $1", [userId]);
      
      console.log(`✅ Emergency reset bypass completed for User ID: ${userId}`);
      
      res.json({
        success: true,
        message: `Emergency reset completed successfully for User ID ${userId}`,
        userId: userId,
        clearedData: {
          patients: "cleared",
          notes: "cleared", 
          symptoms: "cleared",
          processing_status: "cleared",
          uploads: "cleared"
        }
      });
      
    } catch (error) {
      console.error('Emergency reset bypass error:', error);
      res.status(500).json({ 
        success: false,
        error: "Emergency reset failed",
        message: "Database operation failed. Please try again or contact support.",
        details: error.message 
      });
    }
  });

  // Emergency status check - DISABLED FOR HIPAA COMPLIANCE
  app.get('/api/emergency-status', async (req, res) => {
    console.log('🚨 Emergency status blocked - HIPAA compliance violation');
    res.status(403).json({
      error: "Emergency Status is disabled for HIPAA compliance",
      message: "User identification without proper authentication violates healthcare data privacy requirements",
      hipaaCompliance: true
    });
  });
}
