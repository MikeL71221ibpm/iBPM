import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CreditCard, ArrowRight, Loader2, AlertCircle, Info } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { PaymentFlow } from '@/components/payment-controlling-file-05_09_25';

// Last updated: May 9, 2025 - 7:27 PM
// Controls route: /payment

export default function PaymentPage() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [canceled, setCanceled] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // Check if the user canceled the payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('canceled') === 'true') {
      setCanceled(true);
      toast({
        title: 'Payment Canceled',
        description: 'Your payment process was canceled.',
        variant: 'destructive',
      });
    }

    // Log page and component dimensions for debugging
    setTimeout(() => {
      const card = document.querySelector('.card');
      console.log('FINAL Size Measurements:', {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        paymentCardHeight: card ? card.clientHeight : 'not found',
        fullPageHeight: document.body.scrollHeight,
        hasScrollbar: document.body.scrollHeight > window.innerHeight,
        scrollDifference: document.body.scrollHeight - window.innerHeight
      });
    }, 1000);
  }, [toast]);

  const handleRegisterPayment = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in before registering a payment method.',
        variant: 'destructive',
      });
      setLocation('/auth');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Starting setup intent request...');
      
      // Setup intent request - no charge, just card validation
      const response = await apiRequest('POST', '/api/create-setup-intent', {});
      console.log('Setup intent response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create setup intent');
      }

      // Clone the response before parsing it to json
      const responseClone = response.clone();
      const rawText = await responseClone.text();
      console.log('Raw response:', rawText);

      const data = await response.json();
      console.log('Setup intent data:', data);
      
      // Store checkout URL instead of redirecting
      if (data.sessionUrl) {
        console.log('Checkout URL:', data.sessionUrl);
        // Instead of auto-redirect, show a link
        setError('');
        setCheckoutUrl(data.sessionUrl);
        setIsLoading(false);
      } else {
        throw new Error('No checkout URL provided');
      }
    } catch (error: any) {
      console.error('Payment setup error:', error);
      setError(error.message || 'Failed to setup payment method');
      toast({
        title: 'Setup Error',
        description: error.message || 'Failed to setup payment method',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-2 px-4 max-w-full">
      <div className="mb-2">
        <Link href="/receipts">
          <Button variant="outline" size="sm" className="h-7">
            <ArrowLeft className="h-3 w-3 mr-1" />
            Back to Billing
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="flex items-center text-xl">
              <CreditCard className="mr-2 h-5 w-5" />
              Register Payment Method
            </CardTitle>
            <CardDescription className="text-sm">
              Add your payment method for future searches
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            {canceled && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                <p className="text-red-700 text-base">
                  Your previous payment was canceled. You can try again when ready.
                </p>
              </div>
            )}

            <div className="mb-2 p-3 bg-white border rounded-md">
              <div className="flex flex-col">
                <h3 className="font-medium text-lg">Payment Details</h3>
                <div className="mt-1 text-gray-600">
                  <p className="font-medium text-base mb-1">No charge will be made now.</p>
                  <p className="text-base mb-1">When you perform searches, you will be charged:</p>
                  <ul className="list-disc pl-6 mt-0 space-y-0 text-base">
                    <li>$1.00 per individual patient search</li>
                    <li>$1.00 per patient in population health searches</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-base">
                <span className="font-medium">Note:</span> This payment method will be used for all future searches. You will be charged automatically based on your search activity.
              </p>
            </div>

            {error && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-base">{error}</p>
              </div>
            )}

            {checkoutUrl ? (
              <div className="space-y-2">
                <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-700 text-base font-medium">Ready to Complete Registration</p>
                  <p className="text-sm text-green-600">
                    Click below to complete setting up your payment method.
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <a 
                    href={checkoutUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full"
                  >
                    <Button className="w-full text-base h-12" variant="outline">
                      <span className="mr-2">Continue to Stripe Checkout</span>
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </a>
                  <Button
                    variant="link"
                    className="w-full text-base"
                    onClick={() => setCheckoutUrl(null)}
                  >
                    Cancel and Start Over
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={handleRegisterPayment} 
                className="w-full h-10 text-base mt-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Preparing Payment...
                  </>
                ) : (
                  <>
                    Register Payment Method
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center text-2xl">
                <Info className="mr-2 h-6 w-6" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-lg mb-2">Secure Processing</h3>
                  <p className="text-base text-gray-600">
                    All payments are securely processed through Stripe, a PCI-compliant payment processor. Your card details are never stored on our servers.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-lg mb-2">Billing Process</h3>
                  <p className="text-base text-gray-600">
                    After registering your payment method, charges will be processed automatically after each search session.
                    You'll receive an invoice and receipt for all transactions.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium text-lg mb-2">Need Help?</h3>
                  <p className="text-base text-gray-600">
                    If you have any questions about billing or payments, please contact our support team.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}