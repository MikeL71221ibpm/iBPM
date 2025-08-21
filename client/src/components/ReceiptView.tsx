import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

interface ReceiptViewProps {
  receiptNumber: string;
  receiptDate: string;
  amount: number;
  description: string;
  itemCount: number;
  tax: number;
  pdfUrl?: string | null;
}

export default function ReceiptView({
  receiptNumber,
  receiptDate,
  amount,
  description,
  itemCount,
  tax,
  pdfUrl
}: ReceiptViewProps) {
  
  function formatAmount(amount: number): string {
    // Convert cents to dollars
    const value = amount / 100;
    return `$${value.toFixed(2)}`;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return format(date, 'MMMM d, yyyy');
  }
  
  function handlePrint() {
    window.print();
  }
  
  return (
    <Card className="p-6 max-w-lg mx-auto print:border-none print:shadow-none" id="receipt-card">
      <div className="flex justify-between items-center border-b pb-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold">Receipt</h2>
          <p className="text-sm text-muted-foreground">Behavioral Health AI Solutions</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono">{receiptNumber}</p>
          <p className="text-sm text-muted-foreground">{formatDate(receiptDate)}</p>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Services</h3>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-right">Quantity</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-2">{description}</td>
                <td className="p-2 text-right">{itemCount}</td>
                <td className="p-2 text-right">{formatAmount(amount - tax)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="space-y-1 border-t pt-4">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatAmount(amount - tax)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatAmount(tax)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatAmount(amount)}</span>
        </div>
      </div>
      
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>Thank you for your business!</p>
      </div>
      
      <div className="mt-6 flex justify-between print:hidden">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
        
        {pdfUrl && (
          <Button onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}>
            <Download className="h-4 w-4 mr-2" />
            Download Receipt
          </Button>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-card, #receipt-card * {
            visibility: visible;
          }
          #receipt-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        `
      }} />
    </Card>
  );
}