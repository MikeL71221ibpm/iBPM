import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Loader2, Download, FileText, Receipt } from 'lucide-react';

interface PaymentHistory {
  id: number;
  userId: number;
  amount: number;
  currency: string;
  paymentType: string;
  searchType: string | null;
  patientCount: number | null;
  status: string;
  stripePaymentIntentId: string | null;
  stripeInvoiceId: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface ReceiptData {
  id: number;
  paymentId: number;
  userId: number;
  receiptNumber: string;
  receiptDate: string;
  amount: number;
  description: string;
  itemCount: number;
  tax: number;
  pdfUrl: string | null;
  createdAt: string;
}

export default function PaymentsPage() {
  const [selectedTab, setSelectedTab] = useState<string>('payments');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistory | null>(null);

  // Fetch payment history
  const { data: payments, isLoading: paymentsLoading } = useQuery<PaymentHistory[]>({
    queryKey: ['/api/payments'],
    refetchOnWindowFocus: false,
  });

  // Fetch receipts
  const { data: receipts, isLoading: receiptsLoading } = useQuery<ReceiptData[]>({
    queryKey: ['/api/receipts'],
    refetchOnWindowFocus: false,
  });

  function formatAmount(amount: number, currency: string = 'usd'): string {
    // Convert cents to dollars/euros
    const value = amount / 100;
    
    // Format based on currency
    if (currency.toLowerCase() === 'usd') {
      return `$${value.toFixed(2)}`;
    } else if (currency.toLowerCase() === 'eur') {
      return `€${value.toFixed(2)}`;
    }
    
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy h:mm a');
  }

  function getStatusBadgeColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'succeeded':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'processing':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'failed':
      case 'canceled':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Payment History</h1>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Transactions</CardTitle>
              <CardDescription>
                View all your payment transactions for behavioral health searches.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !payments || payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No payment history available.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.createdAt)}</TableCell>
                        <TableCell>
                          {payment.searchType === 'individual' ? 'Individual Search' : 
                           payment.searchType === 'population' ? 'Population Search' : 
                           payment.paymentType}
                        </TableCell>
                        <TableCell>{formatAmount(payment.amount, payment.currency)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedPayment(payment)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="receipts">
          <Card>
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
              <CardDescription>
                View and download receipts for your transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {receiptsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !receipts || receipts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No receipts available.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell>{receipt.receiptNumber}</TableCell>
                        <TableCell>{formatDate(receipt.receiptDate)}</TableCell>
                        <TableCell>{formatAmount(receipt.amount)}</TableCell>
                        <TableCell>{receipt.itemCount}</TableCell>
                        <TableCell className="space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedReceipt(receipt)}
                          >
                            <Receipt className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {receipt.pdfUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => receipt.pdfUrl && window.open(receipt.pdfUrl, '_blank')}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Payment Details Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Transaction ID:</div>
                <div className="text-sm">{selectedPayment.id}</div>
                
                <div className="text-sm font-medium">Date:</div>
                <div className="text-sm">{formatDate(selectedPayment.createdAt)}</div>
                
                <div className="text-sm font-medium">Payment Type:</div>
                <div className="text-sm">{selectedPayment.paymentType}</div>
                
                <div className="text-sm font-medium">Search Type:</div>
                <div className="text-sm">{selectedPayment.searchType || 'N/A'}</div>
                
                <div className="text-sm font-medium">Status:</div>
                <div className="text-sm">
                  <Badge className={getStatusBadgeColor(selectedPayment.status)}>
                    {selectedPayment.status}
                  </Badge>
                </div>
                
                <div className="text-sm font-medium">Amount:</div>
                <div className="text-sm">
                  {formatAmount(selectedPayment.amount, selectedPayment.currency)}
                </div>
                
                {selectedPayment.patientCount && (
                  <>
                    <div className="text-sm font-medium">Patient Count:</div>
                    <div className="text-sm">{selectedPayment.patientCount}</div>
                  </>
                )}
                
                {selectedPayment.stripePaymentIntentId && (
                  <>
                    <div className="text-sm font-medium">Payment ID:</div>
                    <div className="text-sm truncate">{selectedPayment.stripePaymentIntentId}</div>
                  </>
                )}
              </div>
              
              <div className="pt-4 border-t">
                <Button className="w-full" onClick={() => setSelectedPayment(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Receipt Details Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          
          {selectedReceipt && (
            <div className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xl">Receipt</h3>
                <p className="text-sm font-mono">{selectedReceipt.receiptNumber}</p>
              </div>
              
              <div className="border-t border-b py-4">
                <p className="text-sm text-muted-foreground">
                  Receipt Date: {formatDate(selectedReceipt.receiptDate)}
                </p>
                <h4 className="font-semibold mt-3 mb-1">Description</h4>
                <p className="text-sm">{selectedReceipt.description}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatAmount(selectedReceipt.amount - selectedReceipt.tax)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatAmount(selectedReceipt.tax)}</span>
                </div>
                
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatAmount(selectedReceipt.amount)}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedReceipt(null)}
                >
                  Close
                </Button>
                
                {selectedReceipt.pdfUrl && (
                  <Button 
                    className="flex-1"
                    onClick={() => selectedReceipt.pdfUrl && window.open(selectedReceipt.pdfUrl, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}