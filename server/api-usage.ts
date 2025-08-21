import { Router, Request, Response } from 'express';
import { pool } from './db';
import { 
  trackIndividualFileAnalysis, 
  trackPopulationSearch, 
  getTodayUsageSummary, 
  getRecentDailyReceipts,
  generateDailyReceipt
} from './utils/usageTracking';

const router = Router();

// Authentication middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// Track individual file analysis
router.post('/track-individual-file', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Safe type assertion
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID not found' 
      });
    }

    const { fileCount = 1, description = 'Individual file analysis' } = req.body;
    
    // Ensure fileCount is a number
    const fileCountNum = typeof fileCount === 'number' ? fileCount : parseInt(fileCount) || 1;
    
    const trackingId = await trackIndividualFileAnalysis(
      userId, 
      fileCountNum, 
      description
    );
    
    res.status(200).json({ 
      success: true, 
      message: 'Usage tracked successfully', 
      trackingId 
    });
  } catch (error) {
    console.error('Error tracking individual file usage:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to track usage' 
    });
  }
});

// Track population search
router.post('/track-population-search', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID not found' 
      });
    }

    const { recordCount = 1, description = 'Population health search' } = req.body;
    
    // Ensure recordCount is a number
    const recordCountNum = typeof recordCount === 'number' ? recordCount : parseInt(recordCount) || 1;
    
    const trackingId = await trackPopulationSearch(
      userId, 
      recordCountNum, 
      description
    );
    
    res.status(200).json({ 
      success: true, 
      message: 'Usage tracked successfully', 
      trackingId 
    });
  } catch (error) {
    console.error('Error tracking population search usage:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to track usage' 
    });
  }
});

// Get today's usage summary
router.get('/today-usage', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID not found' 
      });
    }

    // Ensure userId is a number
    const userIdNum = typeof userId === 'number' ? userId : parseInt(userId);
    const summary = await getTodayUsageSummary(userIdNum);
    
    res.status(200).json(summary);
  } catch (error) {
    console.error('Error getting today\'s usage summary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get usage summary' 
    });
  }
});

// Get recent daily receipts
router.get('/daily-receipts', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID not found' 
      });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    
    const receipts = await getRecentDailyReceipts(userId, limit);
    
    res.status(200).json(receipts);
  } catch (error) {
    console.error('Error getting daily receipts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get daily receipts' 
    });
  }
});

// Generate daily receipt for a specific date (admin only)
router.post('/generate-daily-receipt', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID not found' 
      });
    }

    const { date } = req.body;
    
    // Parse date or use yesterday as default
    let targetDate: Date;
    if (date) {
      targetDate = new Date(date);
    } else {
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);
    }
    
    const receiptId = await generateDailyReceipt(userId, targetDate);
    
    if (!receiptId) {
      return res.status(200).json({ 
        success: true, 
        message: 'No unbilled usage found for the specified date' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Daily receipt generated successfully', 
      receiptId 
    });
  } catch (error) {
    console.error('Error generating daily receipt:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate daily receipt' 
    });
  }
});

// Get all receipts (for billing page)
router.get('/receipts', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID not found' 
      });
    }
    
    // Query daily receipts
    const receiptsQuery = `
      SELECT 
        id,
        billing_date as "date",
        created_at,
        total_amount_cents as amount,
        receipt_number,
        status,
        individual_file_count,
        population_search_count,
        total_record_count
      FROM daily_receipts
      WHERE user_id = $1
      ORDER BY billing_date DESC
      LIMIT 50
    `;
    
    const { rows: receiptsData } = await pool.query(receiptsQuery, [userId]);
    
    // Format the receipts for the frontend
    const receipts = receiptsData.map((receipt: any) => {
      // Generate items array for the receipt
      const items = [];
      
      if (receipt.individual_file_count > 0) {
        items.push({
          id: `ind-${receipt.id}`,
          description: `Individual file analysis (${receipt.individual_file_count} files)`,
          amount: receipt.individual_file_count * 100 // $1.00 per file
        });
      }
      
      if (receipt.population_search_count > 0) {
        items.push({
          id: `pop-${receipt.id}`,
          description: `Population health search (${receipt.population_search_count} searches, ${receipt.total_record_count} records)`,
          amount: receipt.population_search_count * 100 // $1.00 per search
        });
      }
      
      return {
        id: receipt.id,
        createdAt: receipt.created_at,
        userId,
        amount: receipt.amount,
        paymentId: null,
        receiptNumber: receipt.receipt_number,
        receiptDate: receipt.date,
        description: `Daily usage for ${new Date(receipt.date).toLocaleDateString()}`,
        items,
        itemCount: items.length,
        tax: 0,
        pdfUrl: null,
        status: receipt.status
      };
    });
    
    res.status(200).json(receipts);
  } catch (error) {
    console.error('Error getting receipts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get receipts' 
    });
  }
});

export default router;