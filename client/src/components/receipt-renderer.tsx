import React, { useRef } from "react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer } from "lucide-react";

// Receipt type definition (matches server-side structure)
interface ReceiptItem {
  id: string;
  description: string;
  amount: number;
}

export interface Receipt {
  id: number | string;
  createdAt: Date | string;
  userId: number;
  amount: number;
  paymentId: number | null;
  receiptNumber: string;
  receiptDate: Date | string | null;
  description: string;
  items: ReceiptItem[];
  itemCount: number | null;
  tax: number | null;
  pdfUrl: string | null;
  status: string;
}

interface ReceiptRendererProps {
  receipt: Receipt;
  onClose?: () => void;
}

export default function ReceiptRenderer({ receipt, onClose }: ReceiptRendererProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  }

  function formatDate(dateString: string | Date | null) {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch (err) {
      console.error("Date formatting error:", err);
      return "Invalid Date";
    }
  }

  // Print the receipt using browser print functionality
  const handlePrint = () => {
    window.print();
  };

  // Export receipt to PDF
  const handleExportPDF = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Create PDF with business card dimensions
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Calculate dimensions
      const imgWidth = 210 - 40; // A4 width - margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image to PDF
      pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);

      // Save the PDF
      pdf.save(`receipt-${receipt.receiptNumber}.pdf`);
    } catch (error) {
      console.error("Error exporting receipt to PDF:", error);
    }
  };

  // Calculate totals
  const subtotal = receipt.items && receipt.items.length > 0 
    ? receipt.items.reduce((sum, item) => sum + item.amount, 0)
    : 0;
  const tax = receipt.tax || 0;
  const total = subtotal + tax;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div
        ref={receiptRef}
        className="bg-white p-8 rounded-lg shadow-md"
        id="receipt-container"
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Behavioral Health Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Health-Related Social Needs + Behavioral Health
          </p>
          <p className="text-sm mt-1">
            123 Healthcare Avenue, Suite 400<br />
            San Francisco, CA 94103
          </p>
          <p className="text-sm mt-1">
            Tax ID: 83-1234567<br />
            Phone: (415) 555-9876
          </p>
          <h2 className="text-xl font-bold mt-4 border-t pt-4">RECEIPT / INVOICE</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-sm">Receipt Number:</h3>
            <p>{receipt.receiptNumber}</p>
            <h3 className="font-semibold text-sm mt-2">Date:</h3>
            <p>{formatDate(receipt.receiptDate)}</p>
            <h3 className="font-semibold text-sm mt-2">Period:</h3>
            <p>
              Daily Usage ({formatDate(receipt.receiptDate)}):<br />
              <span className="text-xs text-muted-foreground">
                • Patient Searches: {receipt.items?.filter(item => item.description.includes('Patient')).length || 0} items<br />
                • Population Analytics: {receipt.items?.filter(item => item.description.includes('Population')).length || 0} items<br />
                • Files Analyzed: {receipt.items?.filter(item => item.description.includes('File')).length || 0} items
              </span>
            </p>
          </div>
          <div className="text-right">
            <h3 className="font-semibold text-sm">Customer ID:</h3>
            <p>CUST-{receipt.userId}</p>
            <h3 className="font-semibold text-sm mt-2">Status:</h3>
            <p className={receipt.status === 'paid' ? 'capitalize text-green-600 font-medium' : 'capitalize text-amber-600 font-medium'}>
              {receipt.status}
            </p>
            <h3 className="font-semibold text-sm mt-2">Payment Terms:</h3>
            <p>Due on Receipt</p>
          </div>
        </div>
        
        <div className="border mb-6 p-4 rounded-md bg-gray-50">
          <h3 className="font-semibold text-sm mb-2">Billing Summary:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="font-medium">Previous Balance:</p>
              <p className="font-medium mt-1">Current Charges:</p>
              <p className="font-medium mt-1">Payments:</p>
            </div>
            <div className="text-right">
              <p>$0.00</p>
              <p className="mt-1">{formatCurrency((receipt.amount || 0))}</p>
              <p className="mt-1">$0.00</p>
            </div>
          </div>
        </div>

        <div className="border-t border-b py-4 my-4">
          <h3 className="font-semibold mb-2">Items:</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipt.items && receipt.items.length > 0 ? (
                receipt.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                    No items found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <div className="w-1/2">
            <div className="flex justify-between py-1">
              <span className="font-semibold">Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-semibold">Tax:</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between py-1 border-t mt-2 pt-2">
              <span className="font-bold">Total Current Charges:</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-dashed mt-2 pt-2">
              <span className="font-bold">Previous Balance:</span>
              <span className="font-bold">$0.00</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-bold">Payments Received:</span>
              <span className="font-bold">$0.00</span>
            </div>
            <div className="flex justify-between py-1 border-t border-double mt-2 pt-2 text-lg">
              <span className="font-extrabold">Total Amount Due:</span>
              <span className="font-extrabold">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t pt-4">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Payment Methods:</h3>
              <p className="text-xs text-muted-foreground">
                Credit Card (Visa, Mastercard, AMEX)<br />
                ACH/Wire Transfer<br />
                Check (Payable to Behavioral Health Analytics)
              </p>
            </div>
            <div className="flex-1 mt-4 md:mt-0">
              <h3 className="font-semibold text-sm mb-1">Remittance Instructions:</h3>
              <p className="text-xs text-muted-foreground">
                Please include invoice number with payment<br />
                ACH/Wire: First National Bank<br />
                Account #: XXXX-XXXX-1234<br />
                Routing #: 123456789
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Thank you for your business!</p>
          <p className="mt-1">For questions about this invoice, please contact billing@bh-analytics.com or call (415) 555-1234</p>
          <p className="mt-4 text-xs">Behavioral Health Analytics, Inc. | Federal Tax ID: 83-1234567</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 print:hidden">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button onClick={handleExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}