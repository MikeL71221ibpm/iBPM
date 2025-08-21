// Completely static export buttons demo - May 23, 2025
// No React components, just static HTML

export default function ExportStatic() {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: `
          <div style="margin: 40px; font-family: sans-serif;">
            <h1 style="font-size: 24px; margin-bottom: 20px;">Export Buttons Demo</h1>
            
            <p style="margin-bottom: 20px;">Here's how the export buttons look in the expanded chart view:</p>
            
            <div style="background-color: #111827; padding: 15px; border: 2px solid #EAB308; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="display: flex; align-items: center; gap: 16px;">
                <span style="font-weight: bold; color: white; font-size: 18px;">EXPORT OPTIONS</span>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  <button style="background-color: #2563EB; color: white; font-weight: bold; display: flex; align-items: center; gap: 4px; padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer;">
                    <span>📊</span>
                    <span>CSV</span>
                  </button>
                  
                  <button style="background-color: #16A34A; color: white; font-weight: bold; display: flex; align-items: center; gap: 4px; padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer;">
                    <span>📥</span>
                    <span>CSV Detail</span>
                  </button>
                  
                  <button style="background-color: #9333EA; color: white; font-weight: bold; display: flex; align-items: center; gap: 4px; padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer;">
                    <span>📑</span>
                    <span>Excel</span>
                  </button>
                  
                  <button style="background-color: #EA580C; color: white; font-weight: bold; display: flex; align-items: center; gap: 4px; padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer;">
                    <span>🗄️</span>
                    <span>JSON</span>
                  </button>
                  
                  <button style="background-color: #4B5563; color: white; font-weight: bold; display: flex; align-items: center; gap: 4px; padding: 8px 12px; border-radius: 6px; border: none; cursor: pointer;">
                    <span>🖨️</span>
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div style="border: 1px solid #E5E7EB; padding: 20px; border-radius: 8px; background-color: #F9FAFB; margin-top: 30px;">
              <h2 style="font-size: 20px; margin-bottom: 16px;">Implementation Features</h2>
              <ul style="list-style-type: disc; padding-left: 24px; line-height: 1.6;">
                <li><strong>All 5 Export Options:</strong> CSV, CSV Detail, Excel, JSON, and Print buttons</li>
                <li><strong>Color-Coded:</strong> Blue for CSV, Green for CSV Detail, Purple for Excel, Orange for JSON, Gray for Print</li>
                <li><strong>Visual Design:</strong> Each button includes an icon and descriptive text</li>
                <li><strong>Placement:</strong> Prominently positioned at the top of the expanded chart view</li>
                <li><strong>Integration Plan:</strong> This will be added to all chart expanded views</li>
              </ul>
            </div>
          </div>
        `,
      }}
    />
  );
}