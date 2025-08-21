import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Download, Receipt as ReceiptIcon } from 'lucide-react';
import { Payment } from '@shared/schema';

export default function PaymentSuccessPage() {
  const [location, setLocation] = useLocation();
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  
  // Extract payment intent ID from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntentParam = params.get('payment_intent');
    const paymentIdParam = params.get('payment_id');
    
    if (paymentIntentParam) {
      setPaymentIntentId(paymentIntentParam);
    }
    
    if (paymentIdParam) {
      setPaymentId(paymentIdParam);
    }
  }, []);
  
  // Fetch payment details if we have an ID
  const paymentQuery = useQuery<Payment>({
    queryKey: ['/api/payments', paymentId],
    enabled: !!paymentId,
    refetchOnWindowFocus: false,
  });
  
  // Determine loading and success states
  const isLoading = !paymentIntentId || (paymentId && paymentQuery.isLoading);
  const isSuccess = paymentIntentId && (!paymentId || (paymentQuery.isSuccess && paymentQuery.data?.status === 'succeeded'));
  const isError = paymentQuery.isError || (paymentQuery.isSuccess && paymentQuery.data?.status === 'failed');
  
  function handleGoBackToSearch() {
    setLocation('/home');
  }
  
  function handleViewReceipt() {
    if (paymentId) {
      setLocation(`/receipts/${paymentId}`);
    }
  }
  
  function handleDownloadReceipt() {
    if (paymentId) {
      // Open receipt in a new tab
      window.open(`/api/receipts/${paymentId}/download`, '_blank');
    }
  }
  
  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Payment Status</CardTitle>
          <CardDescription className="text-center">
            {isLoading ? 'Checking payment status...' : 
             isSuccess ? 'Your payment was successful!' : 
             'There was an issue with your payment'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center justify-center py-8">
          {isLoading ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          ) : isSuccess ? (
            <div className="text-center">
              <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Payment Complete</h3>
              <p className="text-gray-500 mb-4">
                {paymentQuery.data?.searchType === 'population'
                  ? `Your Population Health Search for ${paymentQuery.data?.patientCount} patients is now available.`
                  : 'Your Individual Patient Search is now available.'}
              </p>
              <div className="border rounded-md p-3 bg-gray-50 text-sm mb-6">
                <p className="flex justify-between mb-1">
                  <span className="text-gray-500">Payment ID:</span>
                  <span className="font-mono">{paymentQuery.data?.stripePaymentIntentId || paymentIntentId}</span>
                </p>
                <p className="flex justify-between mb-1">
                  <span className="text-gray-500">Amount:</span>
                  <span>${((paymentQuery.data?.amount || 0) / 100).toFixed(2)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span>{new Date(paymentQuery.data?.createdAt || Date.now()).toLocaleDateString()}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-2xl text-red-600">!</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Payment Failed</h3>
              <p className="text-gray-500 mb-4">
                {paymentQuery.error?.message || 'There was an error processing your payment. Please try again.'}
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center space-x-4">
          <Button variant="outline" onClick={handleGoBackToSearch}>
            Return to Search
          </Button>
          
          {isSuccess && (
            <>
              <Button onClick={handleViewReceipt}>
                <ReceiptIcon className="h-4 w-4 mr-2" />
                View Receipt
              </Button>
              <Button variant="outline" onClick={handleDownloadReceipt}>
                <Download className="h-4 w-4 mr-2" />
                Download Receipt
              </Button>
              <Link href="/receipts">
                <Button variant="outline">
                  <ReceiptIcon className="h-4 w-4 mr-2" />
                  Billing
                </Button>
              </Link>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}