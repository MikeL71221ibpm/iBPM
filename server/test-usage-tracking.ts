import { db } from "./db";
import { sql } from 'drizzle-orm';

// Test function to create sample usage data and generate a receipt
export async function testUsageTracking(userId: number) {
  try {
    console.log("=== TESTING USAGE TRACKING ===");
    
    // 1. Track individual file analyses
    console.log("1. Tracking individual file analyses...");
    
    // First batch: 3 files
    console.log(`Tracking individual file analysis for user ${userId}: 3 files`);
    const [fileAnalysis1] = await db.execute(sql`
      INSERT INTO usage_tracking 
        (user_id, tracking_date, type, count, unit_price_cents, amount_cents, status, description)
      VALUES 
        (${userId}, CURRENT_DATE, 'individual_file_analysis', 3, 100, 300, 'pending', 'Test file analysis - batch 1')
      RETURNING id;
    `);
    console.log(`Usage tracked successfully. ID: ${fileAnalysis1.id}`);
    console.log(`   - Tracking ID: ${fileAnalysis1.id}`);
    
    // Second batch: 2 files
    console.log(`Tracking individual file analysis for user ${userId}: 2 files`);
    const [fileAnalysis2] = await db.execute(sql`
      INSERT INTO usage_tracking 
        (user_id, tracking_date, type, count, unit_price_cents, amount_cents, status, description)
      VALUES 
        (${userId}, CURRENT_DATE, 'individual_file_analysis', 2, 100, 200, 'pending', 'Test file analysis - batch 2')
      RETURNING id;
    `);
    console.log(`Usage tracked successfully. ID: ${fileAnalysis2.id}`);
    console.log(`   - Tracking ID: ${fileAnalysis2.id}`);
    
    // 2. Track population searches
    console.log("2. Tracking population searches...");
    
    // First search: 150 records
    console.log(`Tracking population search for user ${userId}: 150 records`);
    const [popSearch1] = await db.execute(sql`
      INSERT INTO usage_tracking 
        (user_id, tracking_date, type, count, unit_price_cents, amount_cents, status, description)
      VALUES 
        (${userId}, CURRENT_DATE, 'population_search', 150, 1, 100, 'pending', 'Test population search - 150 records')
      RETURNING id;
    `);
    console.log(`Usage tracked successfully. ID: ${popSearch1.id}`);
    console.log(`   - Tracking ID: ${popSearch1.id}`);
    
    // Second search: 75 records
    console.log(`Tracking population search for user ${userId}: 75 records`);
    const [popSearch2] = await db.execute(sql`
      INSERT INTO usage_tracking 
        (user_id, tracking_date, type, count, unit_price_cents, amount_cents, status, description)
      VALUES 
        (${userId}, CURRENT_DATE, 'population_search', 75, 1, 100, 'pending', 'Test population search - 75 records')
      RETURNING id;
    `);
    console.log(`Usage tracked successfully. ID: ${popSearch2.id}`);
    console.log(`   - Tracking ID: ${popSearch2.id}`);
    
    // 3. Generate a daily receipt
    console.log("3. Generating daily receipt...");
    
    // Get the current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    console.log(`Generating daily receipt for user ${userId} for date ${today}`);
    
    // Create receipt
    const [receipt] = await db.execute(sql`
      WITH usage_summary AS (
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'individual_file_analysis' THEN count ELSE 0 END), 0) AS total_files,
          COUNT(DISTINCT CASE WHEN type = 'population_search' THEN id END) AS search_count,
          COALESCE(SUM(CASE WHEN type = 'population_search' THEN count ELSE 0 END), 0) AS record_count,
          COALESCE(SUM(amount_cents), 0) AS total_amount_cents
        FROM usage_tracking
        WHERE 
          user_id = ${userId} 
          AND tracking_date = CURRENT_DATE
          AND status = 'pending'
      )
      INSERT INTO receipts 
        (user_id, billing_date, total_amount_cents, receipt_number, status, 
         individual_file_count, population_search_count, total_record_count)
      SELECT 
        ${userId}, 
        CURRENT_DATE, 
        total_amount_cents,
        CONCAT(
          EXTRACT(YEAR FROM CURRENT_DATE), 
          LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::text, 2, '0'), 
          LPAD(EXTRACT(DAY FROM CURRENT_DATE)::text, 2, '0'), 
          '-', 
          ${userId}::text, 
          '-', 
          LPAD((FLOOR(RANDOM() * 9999) + 1)::text, 4, '0')
        ) AS receipt_number,
        'pending',
        total_files,
        search_count,
        record_count
      FROM usage_summary
      RETURNING id;
    `);
    console.log(`Daily receipt generated successfully. ID: ${receipt.id}`);
    console.log(`   - Receipt ID: ${receipt.id}`);
    
    // Mark all tracked usage as charged
    await db.execute(sql`
      UPDATE usage_tracking
      SET status = 'charged', receipt_id = ${receipt.id}
      WHERE 
        user_id = ${userId} 
        AND tracking_date = CURRENT_DATE
        AND status = 'pending';
    `);
    
    // 4. Fetch receipt details
    console.log("4. Fetching receipt details...");
    const [receiptDetails] = await db.execute(sql`
      SELECT * FROM receipts WHERE id = ${receipt.id};
    `);
    console.log(`   - Receipt details: ${JSON.stringify(receiptDetails, null, 2)}`);
    
    // 5. Create receipt items based on usage
    const usageItems = await db.execute(sql`
      SELECT type, count, amount_cents, status
      FROM usage_tracking
      WHERE receipt_id = ${receipt.id}
      ORDER BY id;
    `);
    
    console.log("5. Fetching usage tracking entries...");
    console.log(`   - Found ${usageItems.length} entries:`);
    
    // Create items for display
    const items = usageItems.map((item, index) => {
      let description = `${item.type}: ${item.count} items, $${(item.amount_cents / 100).toFixed(2)}`;
      console.log(`   [${index + 1}] ${description} - ${item.status}`);
      
      return {
        id: `item-${index + 1}`,
        description,
        amount: item.amount_cents
      };
    });
    
    // Create receipt items in the database
    for (const item of items) {
      await db.execute(sql`
        INSERT INTO receipt_items 
          (receipt_id, description, amount_cents)
        VALUES 
          (${receipt.id}, ${item.description}, ${item.amount});
      `);
    }
    
    console.log("=== USAGE TRACKING TEST COMPLETE ===");
    
    // Return the test results
    return {
      success: true,
      message: "Usage tracking test completed successfully",
      data: {
        receipt: receiptDetails,
        items
      }
    };
  } catch (error) {
    console.error("Error in test usage tracking:", error);
    return {
      success: false,
      message: "Error in usage tracking test",
      error: (error as Error).message
    };
  }
}