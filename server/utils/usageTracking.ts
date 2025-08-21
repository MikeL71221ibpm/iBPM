import { pool } from '../db';

// Constants
const INDIVIDUAL_FILE_COST_CENTS = 100; // $1.00 per file
const POPULATION_SEARCH_COST_CENTS = 100; // $1.00 per search

// Track usage for individual file analysis
export async function trackIndividualFileAnalysis(
  userId: number, 
  fileCount: number = 1, 
  description: string = 'Individual file analysis'
) {
  try {
    console.log(`Tracking individual file analysis for user ${userId}: ${fileCount} files`);
    
    const query = `
      INSERT INTO usage_tracking 
        (user_id, event_type, item_count, description, cost_cents) 
      VALUES 
        ($1, 'individual_file_analysis', $2, $3, $4)
      RETURNING id
    `;
    
    const costCents = fileCount * INDIVIDUAL_FILE_COST_CENTS;
    const result = await pool.query(query, [userId, fileCount, description, costCents]);
    
    console.log(`Usage tracked successfully. ID: ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error tracking individual file analysis:', error);
    throw error;
  }
}

// Track usage for population health search
export async function trackPopulationSearch(
  userId: number, 
  recordCount: number = 1,
  description: string = 'Population health search'
) {
  try {
    console.log(`Tracking population search for user ${userId}: ${recordCount} records`);
    
    const query = `
      INSERT INTO usage_tracking 
        (user_id, event_type, item_count, description, cost_cents) 
      VALUES 
        ($1, 'population_search', $2, $3, $4)
      RETURNING id
    `;
    
    const costCents = POPULATION_SEARCH_COST_CENTS; // Flat rate per search
    const result = await pool.query(query, [userId, recordCount, description, costCents]);
    
    console.log(`Usage tracked successfully. ID: ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error tracking population search:', error);
    throw error;
  }
}

// Generate a daily receipt for a user for a specific date (default: yesterday)
export async function generateDailyReceipt(
  userId: number, 
  date: Date = new Date(Date.now() - 86400000) // Default to yesterday
) {
  try {
    // Format date to YYYY-MM-DD for SQL
    const dateStr = date.toISOString().split('T')[0];
    console.log(`Generating daily receipt for user ${userId} for date ${dateStr}`);
    
    // Check if a receipt already exists for this day
    const checkQuery = `
      SELECT id FROM daily_receipts 
      WHERE user_id = $1 AND billing_date = $2::date
    `;
    
    const existingReceipt = await pool.query(checkQuery, [userId, dateStr]);
    if (existingReceipt.rows.length > 0) {
      console.log(`Daily receipt already exists for ${dateStr}`);
      return existingReceipt.rows[0].id;
    }
    
    // Get all unbilled usage for the specified date
    const usageQuery = `
      SELECT 
        event_type, 
        SUM(item_count) as total_items, 
        SUM(cost_cents) as total_cost 
      FROM usage_tracking
      WHERE 
        user_id = $1 AND 
        created_at::date = $2::date AND
        charged = false
      GROUP BY event_type
    `;
    
    const usageResult = await pool.query(usageQuery, [userId, dateStr]);
    
    if (usageResult.rows.length === 0) {
      console.log(`No unbilled usage found for ${dateStr}`);
      return null;
    }
    
    // Calculate totals
    let totalAmount = 0;
    let individualFileCount = 0;
    let populationSearchCount = 0;
    let totalRecordCount = 0;
    
    usageResult.rows.forEach(row => {
      totalAmount += parseInt(row.total_cost);
      
      if (row.event_type === 'individual_file_analysis') {
        individualFileCount += parseInt(row.total_items);
      } else if (row.event_type === 'population_search') {
        populationSearchCount += 1; // Count of searches
        totalRecordCount += parseInt(row.total_items); // Total records processed
      }
    });
    
    // Generate a receipt number (YYYYMMDD-USERID-RANDOM)
    const dateCode = dateStr.replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const receiptNumber = `${dateCode}-${userId}-${randomSuffix}`;
    
    // Create the daily receipt
    const createReceiptQuery = `
      INSERT INTO daily_receipts 
        (user_id, billing_date, total_amount_cents, receipt_number, 
         individual_file_count, population_search_count, total_record_count)
      VALUES 
        ($1, $2::date, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const createResult = await pool.query(
      createReceiptQuery, 
      [userId, dateStr, totalAmount, receiptNumber, 
       individualFileCount, populationSearchCount, totalRecordCount]
    );
    
    const receiptId = createResult.rows[0].id;
    
    // Mark usage items as charged
    const updateUsageQuery = `
      UPDATE usage_tracking
      SET charged = true, daily_receipt_id = $3
      WHERE user_id = $1 AND created_at::date = $2::date AND charged = false
    `;
    
    await pool.query(updateUsageQuery, [userId, dateStr, receiptId]);
    
    console.log(`Daily receipt generated successfully. ID: ${receiptId}`);
    return receiptId;
  } catch (error) {
    console.error('Error generating daily receipt:', error);
    throw error;
  }
}

// Get a user's usage summary for today
export async function getTodayUsageSummary(userId: number) {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Getting today's usage summary for user ${userId}`);
    
    const query = `
      SELECT 
        event_type, 
        COUNT(*) as event_count,
        SUM(item_count) as total_items, 
        SUM(cost_cents) as total_cost 
      FROM usage_tracking
      WHERE 
        user_id = $1 AND 
        created_at::date = $2::date
      GROUP BY event_type
    `;
    
    const result = await pool.query(query, [userId, today]);
    
    // Format the results
    const summary = {
      date: today,
      individual_file_count: 0,
      population_search_count: 0,
      total_record_count: 0,
      total_cost_cents: 0
    };
    
    result.rows.forEach(row => {
      if (row.event_type === 'individual_file_analysis') {
        summary.individual_file_count += parseInt(row.total_items);
      } else if (row.event_type === 'population_search') {
        summary.population_search_count += parseInt(row.event_count);
        summary.total_record_count += parseInt(row.total_items);
      }
      
      summary.total_cost_cents += parseInt(row.total_cost);
    });
    
    return summary;
  } catch (error) {
    console.error('Error getting today\'s usage summary:', error);
    throw error;
  }
}

// Get recent daily receipts for a user
export async function getRecentDailyReceipts(userId: number, limit: number = 10) {
  try {
    console.log(`Getting recent daily receipts for user ${userId}`);
    
    const query = `
      SELECT * FROM daily_receipts
      WHERE user_id = $1
      ORDER BY billing_date DESC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error getting recent daily receipts:', error);
    throw error;
  }
}