import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

/**
 * Utility for exporting charts to different formats
 */

/**
 * Export a chart element as a PNG file
 * @param chartId The data-chart-id attribute value to identify the chart
 * @param chartTitle The title of the chart (used for filename)
 */
export async function exportChartAsPng(chartId: string, chartTitle: string): Promise<boolean> {
  try {
    console.log(`Exporting chart as PNG: ${chartId} - ${chartTitle}`);
    
    // Find the chart element by data attribute
    const chartElement = document.querySelector(`[data-chart-id="${chartId}"]`);
    if (!chartElement) {
      console.error(`Chart element with ID ${chartId} not found`);
      return false;
    }

    // Create a canvas from the chart element
    const canvas = await html2canvas(chartElement as HTMLElement, {
      scale: 2, // Higher scale for better quality
      backgroundColor: '#ffffff',
      logging: true,
      useCORS: true
    });

    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          // Create a formatted filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${chartTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}_${timestamp}.png`;
          
          // Save the file
          saveAs(blob, filename);
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error('Error exporting chart as PNG:', error);
    return false;
  }
}

/**
 * Export a chart element as a PDF file
 * @param chartId The data-chart-id attribute value to identify the chart
 * @param chartTitle The title of the chart (used for filename and PDF title)
 */
export async function exportChartAsPdf(chartId: string, chartTitle: string): Promise<boolean> {
  try {
    console.log(`Exporting chart as PDF: ${chartId} - ${chartTitle}`);
    
    // Find the chart element by data attribute
    const chartElement = document.querySelector(`[data-chart-id="${chartId}"]`);
    if (!chartElement) {
      console.error(`Chart element with ID ${chartId} not found`);
      return false;
    }

    // Create a canvas from the chart element
    const canvas = await html2canvas(chartElement as HTMLElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: true,
      useCORS: true
    });
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm'
    });
    
    // Add title
    pdf.setFontSize(16);
    pdf.text(chartTitle, 14, 14);
    
    // Add timestamp
    const timestamp = new Date().toLocaleString();
    pdf.setFontSize(10);
    pdf.text(`Generated: ${timestamp}`, 14, 22);
    
    // Calculate optimal dimensions for the image
    const imgWidth = 270; // slightly less than A4 landscape width
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add the image
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 14, 28, imgWidth, imgHeight);
    
    // Save the PDF
    const filename = `${chartTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('Error exporting chart as PDF:', error);
    return false;
  }
}

/**
 * Adds data-chart-id attribute to a chart container
 * This is used to identify the chart for export
 * @param element The chart container element
 * @param chartId The ID to assign to the chart
 */
export function makeChartExportable(element: HTMLElement | null, chartId: string): void {
  if (element) {
    element.setAttribute('data-chart-id', chartId);
  }
}