import { Request, Response } from 'express';
import { pool } from './db';
import { 
  trackIndividualFileAnalysis, 
  trackPopulationSearch, 
  getTodayUsageSummary, 
  getRecentDailyReceipts,
  generateDailyReceipt
} from './utils/usageTracking';

// Authentication middleware
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

export function registerUsageRoutes(app: any) {
  // Test endpoint to generate sample receipt data for development
  app.get('/api/test/sample-receipt', isAuthenticated, (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id || 1;
      
      // Create a sample receipt with varied items
      const today = new Date();
      const receiptDate = new Date(today);
      receiptDate.setHours(0, 0, 0, 0);
      
      // Generate a date-based receipt number format: YYYYMMDD-userId-001
      const receiptNumber = `${receiptDate.getFullYear()}${String(receiptDate.getMonth() + 1).padStart(2, '0')}${String(receiptDate.getDate()).padStart(2, '0')}-${userId}-001`;
      
      // Sample items with more realistic data
      const items = [
        {
          id: 'ind-file-1',
          description: 'Patient file analysis - John Doe',
          amount: 100, // $1.00
          quantity: 1,
          unitPrice: 100
        },
        {
          id: 'ind-file-2',
          description: 'Patient file analysis - Jane Smith',
          amount: 100, // $1.00
          quantity: 1,
          unitPrice: 100
        },
        {
          id: 'pop-search-1',
          description: 'Population health search - Anxiety disorders (32 patients)',
          amount: 100, // $1.00
          quantity: 1,
          unitPrice: 100
        },
        {
          id: 'file-batch-1',
          description: 'File analysis batch - Cardiology department (5 files)',
          amount: 500, // $5.00
          quantity: 5,
          unitPrice: 100
        }
      ];
      
      // Calculate the total
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const tax = Math.round(subtotal * 0.08); // 8% tax
      const total = subtotal + tax;
      
      // Sample receipt with all the new accounting fields
      const sampleReceipt = {
        id: 123,
        createdAt: new Date().toISOString(),
        userId,
        amount: total,
        paymentId: null,
        receiptNumber,
        receiptDate: receiptDate.toISOString(),
        description: `Daily usage for ${receiptDate.toLocaleDateString()}`,
        items,
        itemCount: items.length,
        tax,
        pdfUrl: null,
        status: 'pending',
        previousBalance: 1250, // $12.50 previous balance
        paymentsReceived: 0,
        totalDue: total + 1250,
        companyName: "Behavioral Health Analytics, Inc.",
        companyTaxId: "83-1234567",
        companyAddress: "123 Healthcare Avenue, Suite 400, San Francisco, CA 94103",
        companyPhone: "(415) 555-9876",
        companyEmail: "billing@bh-analytics.com",
        customerName: "Memorial Hospital System",
        customerEmail: "accounts@memorialhospital.org",
        dueDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from today
        paymentTerms: "Net 30",
        paymentMethod: "Credit Card"
      };
      
      res.status(200).json(sampleReceipt);
    } catch (error) {
      console.error('Error generating sample receipt:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate sample receipt' 
      });
    }
  });
  // Track individual file analysis
  app.post('/api/usage/track-individual-file', isAuthenticated, async (req: Request, res: Response) => {
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
  app.post('/api/usage/track-population-search', isAuthenticated, async (req: Request, res: Response) => {
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
  app.get('/api/usage/today-usage', isAuthenticated, async (req: Request, res: Response) => {
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
  app.get('/api/usage/daily-receipts', isAuthenticated, async (req: Request, res: Response) => {
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
      const limit = parseInt(req.query.limit as string) || 10;
      
      const receipts = await getRecentDailyReceipts(userIdNum, limit);
      
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
  app.post('/api/usage/generate-daily-receipt', isAuthenticated, async (req: Request, res: Response) => {
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
      const { date } = req.body;
      
      // Parse date or use yesterday as default
      let targetDate: Date;
      if (date) {
        targetDate = new Date(date);
      } else {
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - 1);
      }
      
      const receiptId = await generateDailyReceipt(userIdNum, targetDate);
      
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
  app.get('/api/receipts', isAuthenticated, async (req: Request, res: Response) => {
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
  
  // Get a specific receipt with detailed items
  app.get('/api/receipts/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID not found' 
        });
      }
      
      const receiptId = req.params.id;
      
      // Query receipt details
      const receiptQuery = `
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
        WHERE id = $1 AND user_id = $2
      `;
      
      const { rows: receiptData } = await pool.query(receiptQuery, [receiptId, userId]);
      
      if (receiptData.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Receipt not found' 
        });
      }
      
      const receipt = receiptData[0];
      
      // Query usage items that were included in this receipt
      const usageQuery = `
        SELECT 
          id,
          type,
          count,
          unit_price_cents,
          amount_cents,
          description
        FROM usage_tracking
        WHERE receipt_id = $1 AND user_id = $2
        ORDER BY tracking_date, id
      `;
      
      const { rows: usageItems } = await pool.query(usageQuery, [receiptId, userId]);
      
      // Generate detailed items array for the receipt
      const detailedItems = usageItems.map((item: any) => {
        return {
          id: `usage-${item.id}`,
          description: item.description || 
            (item.type === 'individual_file_analysis' 
              ? `Individual file analysis (${item.count} files)` 
              : `Population health search (${item.count} records)`),
          amount: item.amount_cents
        };
      });
      
      // If no detailed items were found, fall back to summary items
      const items = detailedItems.length > 0 ? detailedItems : [
        ...(receipt.individual_file_count > 0 ? [{
          id: `ind-${receipt.id}`,
          description: `Individual file analysis (${receipt.individual_file_count} files)`,
          amount: receipt.individual_file_count * 100 // $1.00 per file
        }] : []),
        ...(receipt.population_search_count > 0 ? [{
          id: `pop-${receipt.id}`,
          description: `Population health search (${receipt.population_search_count} searches, ${receipt.total_record_count} records)`,
          amount: receipt.population_search_count * 100 // $1.00 per search
        }] : [])
      ];
      
      // Format the receipt for the frontend
      const formattedReceipt = {
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
      
      res.status(200).json(formattedReceipt);
    } catch (error) {
      console.error('Error getting receipt details:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get receipt details' 
      });
    }
  });
}