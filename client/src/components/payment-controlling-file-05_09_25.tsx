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

// Last updated: May 9, 2025 - 7:08 PM
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

console.log('✅ Stripe loaded successfully:', !!stripePromise);

// Payment options for the application
export const PAYMENT_OPTIONS = [
  {
    id: 'patient_search',
    name: 'Patient Search',
    description: 'One-time search for a specific patient record',
    price: 1, // $1.00
    icon: '🔍',
  },
  {
    id: 'unique_patient',
    name: 'Unique Patient',
    description: 'Process records for a unique patient',
    price: 1, // $1.00
    icon: '👤',
  }
];

interface PaymentFlowProps {
  paymentType: string;
  amount: number;
  description: string;
  onPaymentSuccess?: (paymentIntent: any) => void;
  onPaymentError?: (error: any) => void;
  onPaymentCancel?: () => void;
}

// The CheckoutForm component that contains the Stripe payment form
const CheckoutForm = ({ 
  amount, 
  description, 
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel
}: {
  amount: number;
  description: string;
  onPaymentSuccess?: (paymentIntent: any) => void;
  onPaymentError?: (error: any) => void;
  onPaymentCancel?: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('Processing payment...');

    try {
      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setPaymentStatus('Payment failed: ' + error.message);
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        if (onPaymentError) {
          onPaymentError(error);
        }
      } else if (paymentIntent) {
        setPaymentStatus('Payment successful!');
        toast({
          title: "Payment Successful",
          description: `Your payment of $${(amount / 100).toFixed(2)} was successful.`,
        });
        if (onPaymentSuccess) {
          onPaymentSuccess(paymentIntent);
        }
      }
    } catch (err: any) {
      setPaymentStatus('Payment error: ' + err.message);
      toast({
        title: "Payment Error",
        description: err.message,
        variant: "destructive",
      });
      if (onPaymentError) {
        onPaymentError(err);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      <div className="flex items-center justify-between mt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPaymentCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing}
          className="flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Pay ${(amount / 100).toFixed(2)}
            </>
          )}
        </Button>
      </div>
      
      {paymentStatus && (
        <p className={`text-sm mt-2 ${paymentStatus.includes('failed') || paymentStatus.includes('error') ? 'text-red-500' : 'text-green-500'}`}>
          {paymentStatus}
        </p>
      )}
    </form>
  );
};

export const PaymentFlow: React.FC<PaymentFlowProps> = ({
  paymentType,
  amount,
  description,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel
}) => {
  const [clientSecret, setClientSecret] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Convert dollar amount to cents for Stripe
  const amountInCents = Math.round(amount * 100);

  // Set up the payment intent when the component mounts
  useEffect(() => {
    const initializePayment = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Create a PaymentIntent on the server
        const response = await apiRequest('POST', '/api/create-payment-intent', {
          amount: amountInCents,
          paymentType,
          description
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error creating payment intent');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        setError(err.message);
        toast({
          title: "Payment Setup Failed",
          description: err.message,
          variant: "destructive",
        });
        if (onPaymentError) {
          onPaymentError(err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [paymentType, amountInCents, description, toast, onPaymentError]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Setting up payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 space-y-4">
        <p className="text-red-500">{error}</p>
        <Button variant="outline" onClick={onPaymentCancel}>Cancel</Button>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="text-center p-8 space-y-4">
        <p className="text-red-500">
          Stripe configuration is missing. Please contact support.
        </p>
        <Button variant="outline" onClick={onPaymentCancel}>Cancel</Button>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0070f3',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        spacingUnit: '4px',
        borderRadius: '4px',
      },
    },
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {clientSecret && (
        <Elements stripe={stripePromise} options={options}>
          <Card>
            <CardHeader>
              <CardTitle>Complete Your Payment</CardTitle>
              <CardDescription>
                {description} - ${amount.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CheckoutForm 
                amount={amountInCents}
                description={description}
                onPaymentSuccess={onPaymentSuccess}
                onPaymentError={onPaymentError}
                onPaymentCancel={onPaymentCancel}
              />
            </CardContent>
          </Card>
        </Elements>
      )}
    </div>
  );
};

// Payment dialog component for easy integration
export const PaymentDialog = ({
  open,
  onOpenChange,
  paymentType,
  amount,
  description,
  onPaymentSuccess,
  onPaymentError
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentType: string;
  amount: number;
  description: string;
  onPaymentSuccess?: (paymentIntent: any) => void;
  onPaymentError?: (error: any) => void;
}) => {
  const handlePaymentSuccess = useCallback((paymentIntent: any) => {
    if (onPaymentSuccess) {
      onPaymentSuccess(paymentIntent);
    }
    onOpenChange(false);
  }, [onPaymentSuccess, onOpenChange]);

  const handlePaymentError = useCallback((error: any) => {
    if (onPaymentError) {
      onPaymentError(error);
    }
    // We don't close the dialog on error to allow retry
  }, [onPaymentError]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Required</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <PaymentFlow
            paymentType={paymentType}
            amount={amount}
            description={description}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onPaymentCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentFlow;