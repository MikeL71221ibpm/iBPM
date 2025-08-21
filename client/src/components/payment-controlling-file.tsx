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

// Last updated: May 9, 2025 - 5:50 AM
// Controls component: PaymentFlow - handles Stripe payment processing

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
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      setErrorMessage('Payment processing is still initializing. Please try again in a moment.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        // `Elements` instance that was used to create the Payment Element
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        // Show error to your customer
        setErrorMessage(error.message || 'An unexpected error occurred.');
        toast({
          title: 'Payment failed',
          description: error.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      } else {
        // Payment succeeded!
        toast({
          title: 'Payment successful!',
          description: 'Thank you for your payment.',
        });
        onSuccess();
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred.');
      toast({
        title: 'Payment error',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="text-sm text-red-500 mt-2">
          {errorMessage}
        </div>
      )}
      
      <div className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          disabled={!stripe || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Pay Now'
          )}
        </Button>
      </div>
    </form>
  );
}

interface PaymentFlowProps {
  onSuccess: () => void;
}

export function PaymentFlow({ onSuccess }: PaymentFlowProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Function to fetch a payment intent from the server
  const createPaymentIntent = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await apiRequest('POST', '/api/create-payment-intent', { 
        // This would typically come from the cart or order calculation
        amount: 100, // $1.00
        description: 'Patient analysis'
      });
      
      const data = await response.json();
      
      if (!data.clientSecret) {
        throw new Error('Failed to create payment intent. No client secret returned.');
      }
      
      setClientSecret(data.clientSecret);
      return true;
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      toast({
        title: 'Payment Setup Failed',
        description: error.message || 'Could not set up payment. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  // Handle opening the payment dialog
  const handleOpenPaymentDialog = async () => {
    const success = await createPaymentIntent();
    if (success) {
      setShowPaymentDialog(true);
    }
  };
  
  // Handle closing the payment dialog
  const handleClosePaymentDialog = () => {
    setShowPaymentDialog(false);
  };
  
  // Handle successful payment
  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    onSuccess();
  };

  return (
    <>
      <Button
        onClick={handleOpenPaymentDialog}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting up payment...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Proceed to Checkout
          </>
        )}
      </Button>
      
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Enter your payment details to complete the checkout process.
            </DialogDescription>
          </DialogHeader>
          
          {clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm 
                onSuccess={handlePaymentSuccess} 
                onCancel={handleClosePaymentDialog} 
              />
            </Elements>
          ) : (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}