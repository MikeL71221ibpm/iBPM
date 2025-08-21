import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableCell, 
  TableBody 
} from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, ArrowLeft, Receipt, Download, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import ReceiptRenderer, { Receipt as ReceiptType } from '@/components/receipt-renderer';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Last updated: May 10, 2025 - 3:50 PM
// Controls routes: /receipts and /billing

export default function ReceiptsPage() {
  const { data: receipts, isLoading } = useQuery<ReceiptType[]>({
    queryKey: ['/api/receipts'],
  });
  
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  }
  
  function formatDate(dateString: string | Date | null) {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid Date';
    }
  }
  
  // Function to generate PDF directly from the table row
  const generatePDF = async (receipt: ReceiptType) => {
    // Create a safe version of the receipt with defaults for missing properties
    const safeReceipt = {
      ...receipt,
      items: receipt.items || [],
      tax: receipt.tax || 0
    };
    
    // First show the receipt dialog so we can capture it
    setSelectedReceipt(safeReceipt);
    setShowReceiptDialog(true);
    
    // Wait a moment for the dialog to render
    setTimeout(async () => {
      try {
        const receiptElement = document.getElementById('receipt-container');
        if (!receiptElement) {
          console.error('Receipt container not found');
          return;
        }
        
        const canvas = await html2canvas(receiptElement, {
          scale: 2,
          logging: false,
          useCORS: true,
        });
        
        // Create PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        
        // Calculate dimensions
        const imgWidth = 210 - 40; // A4 width - margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
        
        // Save the PDF
        pdf.save(`receipt-${safeReceipt.receiptNumber}.pdf`);
        
        // Close the dialog after PDF generation
        setShowReceiptDialog(false);
      } catch (error) {
        console.error('Error generating PDF:', error);
        setShowReceiptDialog(false);
      }
    }, 500);
  };
  
  const viewReceipt = (receipt: ReceiptType) => {
    // Create a safe version of the receipt with defaults for missing properties
    const safeReceipt = {
      ...receipt,
      items: receipt.items || [],
      tax: receipt.tax || 0
    };
    setSelectedReceipt(safeReceipt);
    setShowReceiptDialog(true);
  };
  
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/home">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mt-2">Billing & Receipts</h1>
          <p className="text-muted-foreground mt-1">
            View and download your billing history
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/payment">
              <FileText className="h-4 w-4 mr-2" />
              Payment Methods
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !receipts || receipts.length === 0 ? (
          <div className="text-center p-12">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No Receipts Available</h2>
            <p className="mt-2 text-muted-foreground">
              You haven't made any payments yet. Receipts will appear here after you make a payment.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/payment">Make a Payment</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Receipt #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>{formatDate(receipt.receiptDate || receipt.createdAt)}</TableCell>
                  <TableCell className="font-mono">
                    {receipt.receiptNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{receipt.description || "Daily Usage"}</div>
                    <div className="text-xs text-muted-foreground">
                      {receipt.items?.length || 0} item{(receipt.items?.length || 0) !== 1 ? 's' : ''}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(receipt.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      receipt.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : receipt.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => viewReceipt(receipt)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
                        onClick={() => generatePDF(receipt)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      
      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-4xl w-[95vw]">
          {selectedReceipt && (
            <ReceiptRenderer 
              receipt={selectedReceipt} 
              onClose={() => setShowReceiptDialog(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}