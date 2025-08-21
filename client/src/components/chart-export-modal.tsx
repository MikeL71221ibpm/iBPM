import React, { useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

interface ChartExportModalProps {
  chartTitle: string;
  chartData: any[];
  isOpen: boolean;
  onClose: () => void;
  chartElement: HTMLElement | null;
}

// Helper function to fix SVG elements for better printing
const fixSvgForPrinting = (svg: SVGSVGElement) => {
  // Fix axis text elements
  const xAxisTexts = svg.querySelectorAll('.nivo-axis-bottom text, .x-axis text');
  xAxisTexts.forEach((text) => {
    const textElement = text as HTMLElement;
    textElement.style.transformOrigin = 'center';
    textElement.style.transform = 'rotate(-45deg) translateY(20px)';
    textElement.style.fontSize = '11px';
    textElement.style.fontWeight = 'bold';
    
    if (textElement.parentElement) {
      textElement.parentElement.style.overflow = 'visible';
    }
    
    textElement.setAttribute('dy', '0');
    textElement.setAttribute('dx', '-10');
  });
  
  // Fix axis container
  const xAxisParent = svg.querySelector('.nivo-axis-bottom, .x-axis');
  if (xAxisParent) {
    const xAxisElement = xAxisParent as HTMLElement;
    xAxisElement.style.transform = 'translate(0, 30px)';
    xAxisElement.style.overflow = 'visible';
  }
};

const ChartExportModal: React.FC<ChartExportModalProps> = ({ 
  chartTitle, 
  chartData, 
  isOpen, 
  onClose,
  chartElement
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Handle clicking outside the modal content
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && event.target === modalRef.current) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);
  
  // Clone and prepare chart element when modal opens
  useEffect(() => {
    if (isOpen && chartElement && chartContainerRef.current) {
      // First, clear the container
      while (chartContainerRef.current.firstChild) {
        chartContainerRef.current.removeChild(chartContainerRef.current.firstChild);
      }
      
      // Clone the chart element
      const chartClone = chartElement.cloneNode(true) as HTMLElement;
      chartClone.id = '';
      chartClone.style.width = '100%';
      chartClone.style.maxWidth = '800px';
      chartClone.style.height = 'auto';
      chartClone.style.minHeight = '400px';
      
      // Fix SVG elements
      const svgElements = chartClone.querySelectorAll('svg');
      svgElements.forEach(svg => {
        svg.style.width = '100%';
        svg.style.height = 'auto';
        svg.style.minHeight = '400px';
        svg.style.maxHeight = '600px';
        fixSvgForPrinting(svg as SVGSVGElement);
      });
      
      // Add the cloned chart to container
      chartContainerRef.current.appendChild(chartClone);
    }
  }, [isOpen, chartElement]);
  
  // Handle download
  const handleDownload = async () => {
    if (!chartContainerRef.current) return;
    
    try {
      const canvas = await html2canvas(chartContainerRef.current, {
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
  
  if (!isOpen) return null;
  
  // Check if "Print with Charts" option is enabled
  const printWithChartsEnabled = 
    document.querySelector('input[id="print-with-charts"]:checked') !== null || 
    document.querySelector('input[value="print-with-charts"]:checked') !== null;
  
  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '90%',
          maxHeight: '90%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Chart Title */}
        <h2 style={{ marginBottom: '15px', textAlign: 'center' }}>
          {chartTitle}
        </h2>
        
        {/* Chart Container */}
        <div 
          ref={chartContainerRef}
          className="expanded-chart-container"
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px'
          }}
        />
        
        {/* Data Source Section */}
        {printWithChartsEnabled && (
          <div
            className="visualization-data-source"
            style={{
              borderTop: '1px solid #ddd',
              paddingTop: '15px',
              marginTop: '15px',
              marginBottom: '15px',
              fontSize: '12px',
              color: '#666',
              width: '100%'
            }}
          >
            <h3 style={{ marginBottom: '8px', fontSize: '14px' }}>
              Visualization Data Source
            </h3>
            <p>Data source: HRSN Behavioral Health Analytics Platform</p>
            <p>Chart generated on: {new Date().toLocaleDateString()}</p>
            <p>Total records: {chartData.length}</p>
            <p>Chart type: {chartTitle}</p>
          </div>
        )}
        
        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '15px',
            marginTop: '20px',
            marginBottom: '10px',
            padding: '10px'
          }}
        >
          <button
            onClick={handleDownload}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            Download as PNG
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f3f4f6',
              color: '#1f2937',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChartExportModal;