import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronRight, Receipt } from 'lucide-react';

interface PaymentSuccessProps {
  paymentId: number;
  amount: number;
  onGoBack?: () => void;
}

export default function PaymentSuccess({ paymentId, amount, onGoBack }: PaymentSuccessProps) {
  const [showAnimation, setShowAnimation] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(false), 2000);
    return () => clearTimeout(timer);
  }, []);
  
  // Fetch payment details
  const { data: payment } = useQuery({
    queryKey: [`/api/payments/${paymentId}`],
    enabled: !!paymentId,
    refetchInterval: (data) => {
      // Poll every 5 seconds until payment status is updated
      return data?.status === 'succeeded' ? false : 5000;
    }
  });

  // Format the amount (from cents to dollars)
  const formatAmount = (cents: number) => {
    const dollars = cents / 100;
    return `$${dollars.toFixed(2)}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        {showAnimation ? (
          <div className="flex justify-center">
            <div className="animate-ping h-16 w-16 rounded-full bg-green-100 opacity-75 mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
        )}
        
        <CardTitle className="text-2xl">Payment Successful</CardTitle>
        <CardDescription>
          Thank you for your payment of {formatAmount(amount)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="text-center">
        <p className="mb-4">
          Your payment has been processed successfully and your search results are now available.
        </p>
        
        {payment?.status === 'succeeded' && (
          <p className="text-sm text-muted-foreground">
            Payment ID: {payment.stripePaymentIntentId || payment.id}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-2">
        <Button variant="default" className="w-full" onClick={onGoBack}>
          View Results
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
        
        <Button variant="outline" className="w-full" asChild>
          <Link href="/payments">
            <span className="flex items-center">
              <Receipt className="h-4 w-4 mr-2" />
              View Payment History
            </span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}