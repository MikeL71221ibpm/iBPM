import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  title: string;
  data: any[];
}

/**
 * BasicSymptomTable - A very simple table that directly displays symptom segments
 * Completely bypasses any data transformation to ensure accurate symptom segment display
 */
const BasicSymptomTable: React.FC<Props> = ({ title, data }) => {
  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch (e) {
      return dateStr;
    }
  };
  
  // Get field value handling both snake_case and camelCase
  const getFieldValue = (item: any, field: string, camelField?: string) => {
    if (item[field] !== undefined && item[field] !== null) {
      return item[field];
    } else if (camelField && item[camelField] !== undefined && item[camelField] !== null) {
      return item[camelField];
    }
    return 'N/A';
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-gray-500">No symptom data available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-2 border-b">Symptom Segment</th>
                <th className="px-4 py-2 border-b">Segment Length</th>
                <th className="px-4 py-2 border-b">Has Whitespace</th>
                <th className="px-4 py-2 border-b">Category</th>
                <th className="px-4 py-2 border-b">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                // Get symptom segment with fallback to camelCase version
                const symptomSegment = getFieldValue(item, 'symptom_segment', 'symptomSegment');
                
                // Get diagnostic category with fallback to camelCase version
                const diagnosticCategory = getFieldValue(item, 'diagnostic_category', 'diagnosticCategory');
                
                // Get date with fallback to camelCase version
                const date = getFieldValue(item, 'dos_date', 'dosDate');
                
                // Check for whitespace
                const hasLeadingWhitespace = typeof symptomSegment === 'string' && symptomSegment.startsWith(' ');
                const hasTrailingWhitespace = typeof symptomSegment === 'string' && symptomSegment.endsWith(' ');
                const hasExtraWhitespace = typeof symptomSegment === 'string' && symptomSegment.includes('  '); // Two or more consecutive spaces
                
                const whitespaceWarning = hasLeadingWhitespace || hasTrailingWhitespace || hasExtraWhitespace;
                
                return (
                  <tr key={item.id || `row-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 border-b font-mono">
                      {/* Pre tag preserves whitespace exactly as in the data */}
                      <pre className="whitespace-pre-wrap">{symptomSegment}</pre>
                    </td>
                    <td className="px-4 py-2 border-b text-center">
                      {typeof symptomSegment === 'string' ? symptomSegment.length : 'N/A'}
                    </td>
                    <td className={`px-4 py-2 border-b ${whitespaceWarning ? 'text-amber-600' : 'text-green-600'}`}>
                      {whitespaceWarning ? (
                        <div>
                          {hasLeadingWhitespace && <div>Leading: ✓</div>}
                          {hasTrailingWhitespace && <div>Trailing: ✓</div>}
                          {hasExtraWhitespace && <div>Extra: ✓</div>}
                        </div>
                      ) : 'None'}
                    </td>
                    <td className="px-4 py-2 border-b">{diagnosticCategory}</td>
                    <td className="px-4 py-2 border-b">{typeof date === 'string' ? formatDate(date) : date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default BasicSymptomTable;