import React, { useState, useEffect, useCallback } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard } from 'lucide-react';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.

// In Vite, environment variables available to the client must be prefixed with VITE_
// We'll fall back to VITE_STRIPE_PUBLIC_KEY if TEST_STRIPE_PUBLIC_KEY is not available
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

console.log('Stripe public key available:', !!stripePublicKey);
if (stripePublicKey) {
  console.log('Stripe key prefix:', stripePublicKey.substring(0, 7));
}

const stripePromise = stripePublicKey
  ? loadStripe(stripePublicKey)
  : null;

// Log when the promise resolves to check if it's loading correctly
if (stripePromise) {
  stripePromise.then(
    (stripe) => console.log('✅ Stripe loaded successfully:', !!stripe),
    (error) => console.error('❌ Failed to load Stripe:', error)
  );
} else {
  console.error('❌ No Stripe promise created - missing public key');
}

// The checkout form component
function CheckoutForm({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('✅ Payment form submitted');

    if (!stripe || !elements) {
      console.error('❌ Stripe or elements not available', { stripe: !!stripe, elements: !!elements });
      toast({
        title: 'Payment Error',
        description: 'Stripe is not available. Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    console.log('✅ Stripe and elements are available');
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Simplified approach: Just use the standard Stripe confirmPayment method
      console.log('⏳ Initiating payment confirmation...');
      const returnUrl = `${window.location.origin}/payment-success`;
      console.log(`📌 Return URL: ${returnUrl}`);

      // Debug available payment methods
      console.log('✅ Starting confirmation with Stripe v1 method');
      
      // IMPORTANT: We need to use explicit redirection to work with test keys and live keys together
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Return to payment success page after successful payment
          return_url: returnUrl,
        },
        redirect: 'always', // Force redirect to handle the test/live key mismatch
      });

      // This code should only run if there's a client-side error before redirect
      console.log('⚠️ No redirect occurred - this is unusual and indicates a problem', result);
      
      if (result.error) {
        console.error('❌ Payment confirmation error:', result.error);
        console.error('Error type:', result.error.type);
        console.error('Error code:', result.error.code);
        console.error('Error message:', result.error.message);
        
        setErrorMessage(result.error.message || 'An error occurred during payment processing');
        toast({
          title: 'Payment Failed',
          description: result.error.message || 'An error occurred during payment processing',
          variant: 'destructive',
        });
      } else {
        // If no error and no redirect (unusual but possible)
        console.log('⚠️ No error but no redirect occurred. Manually redirecting...');
        window.location.href = returnUrl;
      }
    } catch (e: any) {
      console.error('❌ Unexpected payment error:', e);
      console.error('Error stack:', e.stack);
      setErrorMessage(e.message || 'An unexpected error occurred');
      toast({
        title: 'Payment Error',
        description: e.message || 'An unexpected error occurred during payment',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <PaymentElement />
        
        {errorMessage && (
          <div className="text-sm text-red-500">{errorMessage}</div>
        )}
        
        <div className="flex justify-between space-x-4 mt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button type="submit" disabled={!stripe || isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Pay Now'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

export interface PaymentFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  description: string;
  searchType: 'individual' | 'population';
  patientCount?: number;
}

export function PaymentFlow({
  isOpen,
  onClose,
  onSuccess,
  amount,
  description,
  searchType,
  patientCount = 1,
}: PaymentFlowProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Remove direct debug logging to prevent infinite update loops

  const initializePayment = useCallback(async () => {
    console.log('🔄 Initializing payment flow...');
    // Set loading state and prevent double-initialization
    setIsLoading(true);
    try {
      // Ensure the amount is properly processed based on the search type
      let finalAmount = amount;
      if (searchType === 'population') {
        // Population search: $1 per patient
        finalAmount = patientCount;
        console.log(`📈 Population search: $${finalAmount.toFixed(2)} ($1.00 × ${patientCount} patients)`);
      } else {
        // Individual search: $1 flat fee
        finalAmount = 1;
        console.log(`👤 Individual search: $${finalAmount.toFixed(2)} (flat fee)`);
      }
      
      console.log(`🔵 Calling API to create payment intent for $${finalAmount.toFixed(2)}`);
      
      // Create the payment intent via API
      const response = await apiRequest('POST', '/api/create-payment-intent', {
        amount: finalAmount,
        searchType,
        patientCount,
      });
      
      console.log(`API response status:`, response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error (${response.status}):`, errorText);
        throw new Error(`Failed to initialize payment: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Received client secret (length: ${data.clientSecret?.length || 0})`);
      console.log(`✅ Payment ID from server: ${data.paymentId}`);
      
      setClientSecret(data.clientSecret);
      console.log('💳 Payment initialization complete, ready to render Stripe form');
    } catch (error: any) {
      console.error("❌ Error initializing payment:", error);
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to initialize payment',
        variant: 'destructive',
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [amount, searchType, patientCount, onClose, toast]);

  // Initialize payment when dialog opens
  // Use useEffect to avoid render loop
  useEffect(() => {
    if (isOpen && !clientSecret && !isLoading) {
      initializePayment();
    }
  }, [isOpen, clientSecret, isLoading, initializePayment]);

  // Fix for maximum update depth exceeded error - use isOpen directly instead of a memoized value

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Payment</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Initializing payment...</span>
            </div>
          ) : clientSecret && stripePromise ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Payment Details</CardTitle>
                <CardDescription>
                  {searchType === 'population' 
                    ? `Amount: $${patientCount.toFixed(2)} ($1.00 × ${patientCount} patients)`
                    : 'Amount: $1.00'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Elements 
                  stripe={stripePromise} 
                  options={{ 
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#6200ea',
                        borderRadius: '8px',
                      },
                    },
                    loader: 'auto',
                    fonts: [
                      {
                        cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
                      },
                    ],
                  }}
                >
                  <CheckoutForm 
                    onSuccess={onSuccess} 
                    onCancel={onClose} 
                  />
                </Elements>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-4">
              <p>Unable to initialize payment. Please try again.</p>
              <Button className="mt-4" onClick={onClose}>Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}