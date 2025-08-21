import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import html2canvas from 'html2canvas';

interface ChartExportButtonProps {
  chartTitle: string;
  chartId: string;
  data: any[];
}

export const ChartExportButton = ({ chartTitle, chartId, data }: ChartExportButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDownload = async () => {
    const chartElement = document.getElementById(chartId);
    if (!chartElement) return;

    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: 'white',
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true
      });
      
      // Create download link
      const imageUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = imageUrl;
      downloadLink.download = `${chartTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error('Error capturing chart:', error);
    }
  };

  // Check if "Print with Charts" option is enabled
  const isPrintWithChartsEnabled = () => {
    return document.querySelector('input[id="print-with-charts"]:checked') !== null || 
           document.querySelector('input[value="print-with-charts"]:checked') !== null;
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto flex items-center gap-1"
        onClick={handleOpenModal}
      >
        <Maximize2 className="h-4 w-4" />
        <span>Print Chart</span>
      </Button>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Only close if clicking on the backdrop (not on the modal content)
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 max-w-[90%] max-h-[90%] overflow-auto flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4">{chartTitle}</h2>
            
            {/* Chart container */}
            <div className="w-full mb-6">
              {document.getElementById(chartId) && (
                <div 
                  className="chart-clone w-full"
                  dangerouslySetInnerHTML={{ 
                    __html: document.getElementById(chartId)?.outerHTML || '' 
                  }} 
                />
              )}
            </div>
            
            {/* Data source (conditional) */}
            {isPrintWithChartsEnabled() && (
              <div className="text-sm text-gray-500 border-t border-gray-200 pt-4 w-full mb-4">
                <h3 className="font-medium mb-1">Visualization Data Source</h3>
                <p>Data source: HRSN Behavioral Health Analytics Platform</p>
                <p>Chart generated on: {new Date().toLocaleDateString()}</p>
                <p>Total records: {data.length}</p>
                <p>Chart type: {chartTitle}</p>
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex gap-4 mt-2">
              <button
                className="px-5 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                onClick={handleDownload}
              >
                Download as PNG
              </button>
              <button
                className="px-5 py-2 bg-gray-100 text-gray-800 font-medium rounded-md border border-gray-300 hover:bg-gray-200"
                onClick={() => {
                  try {
                    handleCloseModal();
                  } catch (error) {
                    console.log('Error closing modal:', error);
                  }
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChartExportButton;