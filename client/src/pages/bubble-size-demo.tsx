import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateBubbleSize, BUBBLE_SIZE_SCALE } from '@/lib/bubble-size-utils';

/**
 * Component to demonstrate the standardized bubble sizes
 * Provides a visual reference for the 10-tier bubble size system used in visualizations
 */
export default function BubbleSizeDemo() {
  // Example data to show the 10-tier bubble size scale
  const sizeValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15];
  
  return (
    <div className="container mx-auto py-6 px-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Standardized Bubble Size Demo</CardTitle>
          <CardDescription>
            Visual reference for the 10-tier bubble size system used in all visualizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-2">Size Scale Reference</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Bubble sizes follow a consistent scale from 5px to 23px radius with 2px increments.
            Values 10 and above share the same maximum size.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* Standard Sizes */}
            <div className="border rounded-md p-4">
              <h4 className="text-base font-bold mb-4">Standard Size Bubbles</h4>
              <div className="flex flex-wrap gap-6 justify-center">
                {sizeValues.map((value) => {
                  const bubbleSize = calculateBubbleSize(value);
                  return (
                    <div key={value} className="flex flex-col items-center justify-center">
                      <div 
                        className="bg-blue-500 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ 
                          width: `${bubbleSize * 2}px`, 
                          height: `${bubbleSize * 2}px`,
                          fontSize: value > 9 ? '11px' : '13px'
                        }}
                      >
                        {value}
                      </div>
                      <div className="text-xs mt-1 text-center">
                        {bubbleSize}px
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Sizing With Text Labels */}
            <div className="border rounded-md p-4">
              <h4 className="text-base font-bold mb-4">Size Tier Comparison</h4>
              <div className="flex flex-col gap-3">
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((value) => {
                  const bubbleSize = calculateBubbleSize(value);
                  return (
                    <div key={value} className="flex items-center gap-3">
                      <div 
                        className="bg-purple-500 rounded-full flex items-center justify-center text-white font-medium"
                        style={{ 
                          width: `${bubbleSize * 2}px`, 
                          height: `${bubbleSize * 2}px`,
                          minWidth: `${bubbleSize * 2}px`
                        }}
                      ></div>
                      <div className="text-sm">
                        <span className="font-medium">Value {value}</span>: {bubbleSize}px radius
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Value to Size Scale */}
            <div className="border rounded-md p-4 col-span-2">
              <h4 className="text-base font-bold mb-4">Complete Value-to-Size Scale</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Value</th>
                    <th className="text-left p-2">Radius (px)</th>
                    <th className="text-left p-2">Diameter (px)</th>
                    <th className="text-left p-2">Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { value: "1", size: BUBBLE_SIZE_SCALE.VALUE_1 },
                    { value: "2", size: BUBBLE_SIZE_SCALE.VALUE_2 },
                    { value: "3", size: BUBBLE_SIZE_SCALE.VALUE_3 },
                    { value: "4", size: BUBBLE_SIZE_SCALE.VALUE_4 },
                    { value: "5", size: BUBBLE_SIZE_SCALE.VALUE_5 },
                    { value: "6", size: BUBBLE_SIZE_SCALE.VALUE_6 },
                    { value: "7", size: BUBBLE_SIZE_SCALE.VALUE_7 },
                    { value: "8", size: BUBBLE_SIZE_SCALE.VALUE_8 },
                    { value: "9", size: BUBBLE_SIZE_SCALE.VALUE_9 },
                    { value: "10+", size: BUBBLE_SIZE_SCALE.VALUE_10_PLUS },
                  ].map((item) => (
                    <tr key={item.value} className="border-b">
                      <td className="p-2 font-medium">{item.value}</td>
                      <td className="p-2">{item.size}px</td>
                      <td className="p-2">{item.size * 2}px</td>
                      <td className="p-2">
                        <div 
                          className="bg-green-500 rounded-full"
                          style={{ 
                            width: `${item.size * 2}px`, 
                            height: `${item.size * 2}px`
                          }}
                        ></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-6">
            <h3 className="text-base font-semibold mb-2">Implementation Details</h3>
            <p className="text-sm">
              All visualizations use the shared <code>calculateBubbleSize()</code> utility function 
              from <code>client/src/lib/bubble-size-utils.ts</code>. This ensures consistent 
              bubble sizing across all visualization components.
            </p>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Code Reference</h3>
          <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-x-auto">
            {`// Import the bubble size utility
import { calculateBubbleSize } from '@/lib/bubble-size-utils';

// Use in nodeSize prop
nodeSize={(d) => {
  if (!d?.data) return 5; // Default size
  
  // Get the value for sizing
  const value = d.data.size || 1;
  
  // Use the utility function to calculate bubble size
  return calculateBubbleSize(value);
}}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}