import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CreditCard, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

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
    <div className="container mx-auto py-12 px-4 max-w-2xl">
      <div className="mb-8">
        <Link href="/receipts">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Billing
          </Button>
        </Link>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Register Payment Method
            </CardTitle>
            <CardDescription>
              Register your payment details for future searches
            </CardDescription>
          </CardHeader>

          <CardContent>
            {canceled && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                <p className="text-red-700 text-sm">
                  Your previous payment was canceled. You can try again when ready.
                </p>
              </div>
            )}

            <div className="mb-6 p-4 bg-white border rounded-md">
              <div className="flex flex-col">
                <h3 className="font-medium text-lg">Payment Details</h3>
                <div className="mt-6 text-sm text-gray-600">
                  <p className="font-medium text-base mb-2">No charge will be made now.</p>
                  <p>You'll only be asked to enter your payment details for future searches.</p>
                  <p className="mt-2">When you perform searches, you will be charged:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>$1.00 per individual patient search</li>
                    <li>$1.00 per patient in population health searches</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="my-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-800 text-sm">
                <span className="font-medium">Note:</span> This payment method will be used for all future searches. You will be charged automatically based on your search activity.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {checkoutUrl ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-700 text-sm font-medium mb-2">Stripe Checkout Ready</p>
                  <p className="text-sm text-green-600">
                    Click the button below to proceed to Stripe's secure checkout page and register your payment method.
                  </p>
                </div>
                <a 
                  href={checkoutUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button className="w-full" variant="outline">
                    <span className="mr-2">Continue to Stripe Checkout</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <Button
                  variant="link"
                  className="w-full mt-2"
                  onClick={() => setCheckoutUrl(null)}
                >
                  Cancel and Start Over
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleRegisterPayment} 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing Payment...
                  </>
                ) : (
                  <>
                    Register Payment Method
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}