// Chart Print Utilities - May 21, 2025
// Specialized functions for chart rendering and printing

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Creates a full-page PDF of a chart element
 * @param chartElement The DOM element containing the chart
 * @param title Chart title
 * @param description Chart description
 * @param displayMode Current display mode (count or percentage)
 * @returns Promise resolved with the filename of the saved PDF
 */
export async function createChartPDF(
  chartElement: HTMLElement,
  title: string,
  description: string,
  displayMode: 'count' | 'percentage'
): Promise<string> {
  // Create a temporary full-page container for the PDF
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '1100px';
  container.style.height = '800px';
  container.style.backgroundColor = '#ffffff';
  document.body.appendChild(container);

  // Create layout structure
  const header = document.createElement('div');
  header.style.padding = '30px 30px 10px 30px';
  header.style.textAlign = 'center';
  container.appendChild(header);

  // Add title
  const titleEl = document.createElement('h1');
  titleEl.textContent = title;
  titleEl.style.fontFamily = 'Arial, sans-serif';
  titleEl.style.fontSize = '28px';
  titleEl.style.fontWeight = 'bold';
  titleEl.style.margin = '0 0 10px 0';
  titleEl.style.padding = '0';
  header.appendChild(titleEl);

  // Add description
  const descEl = document.createElement('p');
  descEl.textContent = description;
  descEl.style.fontFamily = 'Arial, sans-serif';
  descEl.style.fontSize = '16px';
  descEl.style.margin = '0 0 5px 0';
  descEl.style.color = '#555';
  header.appendChild(descEl);

  // Add display mode info
  const modeEl = document.createElement('p');
  modeEl.textContent = `Display Mode: ${displayMode === 'count' ? 'Count Values' : 'Percentage Values'}`;
  modeEl.style.fontFamily = 'Arial, sans-serif';
  modeEl.style.fontSize = '14px';
  modeEl.style.fontStyle = 'italic';
  modeEl.style.margin = '0 0 20px 0';
  modeEl.style.color = '#777';
  header.appendChild(modeEl);

  // Create chart content area
  const chartContent = document.createElement('div');
  chartContent.style.width = '100%';
  chartContent.style.height = '650px';
  chartContent.style.padding = '0 20px';
  container.appendChild(chartContent);

  // Capture the original chart
  const chartCanvas = await html2canvas(chartElement, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff'
  });

  // Create an image to display the chart
  const chartImg = new Image();
  chartImg.src = chartCanvas.toDataURL('image/png');
  chartImg.style.width = '100%';
  chartImg.style.height = '100%';
  chartImg.style.objectFit = 'contain';
  chartContent.appendChild(chartImg);

  // Wait for the image to load
  await new Promise<void>((resolve) => {
    chartImg.onload = () => resolve();
    setTimeout(resolve, 300); // Backup timeout
  });

  // Create a high-quality canvas of the entire layout
  const fullCanvas = await html2canvas(container, {
    scale: 3, // Higher resolution
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false
  });

  // Remove the temporary container
  document.body.removeChild(container);

  // Create the PDF in landscape mode
  const pdf = new jsPDF('l', 'mm', 'a4');
  
  // A4 landscape dimensions
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  
  // Add the image to the PDF - full page
  pdf.addImage(
    fullCanvas.toDataURL('image/png'),
    'PNG',
    0, 0,
    pdfWidth, pdfHeight
  );

  // Save the PDF
  const filename = `${title.replace(/\s+/g, '_')}_chart.pdf`;
  pdf.save(filename);
  
  return filename;
}

/**
 * Sets up a chart for full-screen display
 * @param dialogContent The target dialog content element
 * @param chartElement The original chart element to enhance
 * @param title Chart title
 * @param description Chart description
 */
export function setupFullPageChart(
  dialogContent: HTMLElement,
  chartElement: HTMLElement,
  title: string,
  description: string
): void {
  // Clear the dialog content
  dialogContent.innerHTML = '';
  
  // Set full-page styles
  dialogContent.style.padding = '20px';
  dialogContent.style.display = 'flex';
  dialogContent.style.flexDirection = 'column';
  dialogContent.style.alignItems = 'center';
  dialogContent.style.justifyContent = 'flex-start';
  dialogContent.style.height = '100vh';
  dialogContent.style.width = '100vw';
  dialogContent.style.overflow = 'hidden';
  
  // Create title
  const titleEl = document.createElement('h1');
  titleEl.textContent = title;
  titleEl.style.fontSize = '28px';
  titleEl.style.fontWeight = 'bold';
  titleEl.style.marginBottom = '5px';
  titleEl.style.textAlign = 'center';
  dialogContent.appendChild(titleEl);
  
  // Create description
  const descEl = document.createElement('p');
  descEl.textContent = description;
  descEl.style.fontSize = '16px';
  descEl.style.marginBottom = '20px';
  descEl.style.textAlign = 'center';
  descEl.style.color = '#555';
  dialogContent.appendChild(descEl);
  
  // Create chart container
  const chartContainer = document.createElement('div');
  chartContainer.style.width = '90%';
  chartContainer.style.height = 'calc(100vh - 150px)';
  chartContainer.style.display = 'flex';
  chartContainer.style.alignItems = 'center';
  chartContainer.style.justifyContent = 'center';
  dialogContent.appendChild(chartContainer);
  
  // Clone the chart element
  const clonedChart = chartElement.cloneNode(true) as HTMLElement;
  clonedChart.style.width = '100%';
  clonedChart.style.height = '100%';
  chartContainer.appendChild(clonedChart);
}