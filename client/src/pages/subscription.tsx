import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, X, CreditCard, Info, Crown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

const CheckoutForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setIsProcessing(true);
    
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/subscription?success=true",
      },
      redirect: 'if_required'
    });
    
    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Your subscription has been updated"
      });
      onSuccess();
    }
    
    setIsProcessing(false);
  };
  
  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <PaymentElement className="mb-6" />
      <Button 
        type="submit" 
        className="w-full bg-primary-600 hover:bg-primary-700"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? "Processing..." : "Pay Now"}
      </Button>
    </form>
  );
};

const PlanCard = ({ 
  title, 
  price, 
  features, 
  isCurrent = false, 
  buttonText, 
  onSelect 
}: { 
  title: string, 
  price: string, 
  features: string[], 
  isCurrent?: boolean, 
  buttonText: string, 
  onSelect: () => void 
}) => {
  return (
    <div className={`border rounded-lg overflow-hidden ${isCurrent ? 'border-primary-300 ring-2 ring-primary-500 relative' : ''}`}>
      {isCurrent && (
        <div className="absolute top-0 right-0 bg-primary-500 text-white text-xs px-2 py-1 rounded-bl">
          Current Plan
        </div>
      )}
      <div className={`px-4 py-3 border-b ${isCurrent ? 'bg-primary-50 border-primary-200' : 'bg-neutral-50'}`}>
        <h4 className={`font-medium ${isCurrent ? 'text-primary-800' : ''}`}>{title}</h4>
      </div>
      <div className="p-4">
        <div className="text-center mb-4">
          <span className="text-2xl font-bold">{price}</span>
          <span className="text-neutral-500">/month</span>
        </div>
        <ul className="space-y-2 mb-4 text-sm">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-4 w-4 text-green-500 mt-1 mr-2" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button 
          className={`w-full ${
            isCurrent 
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : buttonText === 'Downgrade' 
                ? 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                : 'bg-secondary-500 text-white hover:bg-secondary-600'
          }`}
          onClick={onSelect}
          disabled={isCurrent}
        >
          {isCurrent ? 'Current Plan' : buttonText}
        </Button>
      </div>
    </div>
  );
};

export default function Subscription() {
  const [currentPlan, setCurrentPlan] = useState("professional");
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();
  
  const plans = [
    {
      id: "basic",
      title: "Basic Plan",
      price: "$49",
      features: [
        "Up to 25 patients",
        "Basic analytics",
        "Standard reports",
        "Email support"
      ]
    },
    {
      id: "professional",
      title: "Professional Plan",
      price: "$99",
      features: [
        "Up to 100 patients",
        "Advanced analytics",
        "Custom reports",
        "Priority email & phone support"
      ]
    },
    {
      id: "enterprise",
      title: "Enterprise Plan",
      price: "$249",
      features: [
        "Unlimited patients",
        "Advanced analytics & predictions",
        "Custom AI model training",
        "24/7 dedicated support"
      ]
    }
  ];
  
  const handleSelectPlan = async (planId: string) => {
    if (!stripePromise) {
      toast({
        title: "Configuration Error",
        description: "Stripe is not properly configured. Please check your environment variables.",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedPlan(planId);
    
    try {
      // Get the price amount based on plan
      const planPrices: Record<string, number> = {
        basic: 49,
        professional: 99,
        enterprise: 249
      };
      
      // Create payment intent
      const response = await apiRequest('POST', '/api/create-payment-intent', {
        amount: planPrices[planId],
        planId
      });
      
      const data = await response.json();
      setClientSecret(data.clientSecret);
      setShowPayment(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive"
      });
    }
  };
  
  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setCurrentPlan(selectedPlan || currentPlan);
    setSelectedPlan(null);
    
    toast({
      title: "Subscription Updated",
      description: "Your subscription has been successfully updated."
    });
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="subscription">
            <Card className="mb-6">
              <CardHeader>
                <h3 className="text-lg font-medium text-gray-900">Subscription Management</h3>
              </CardHeader>
              <CardContent>
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <Info className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-primary-800">Your Subscription Status</h4>
                      <p className="mt-1 text-sm text-primary-700">
                        You are currently on the <span className="font-semibold">Professional Plan</span>. 
                        Your subscription renews on <span className="font-semibold">June 15, 2023</span>.
                      </p>
                    </div>
                  </div>
                </div>
                
                {showPayment && clientSecret && stripePromise ? (
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Complete Your Payment</h4>
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <CheckoutForm onSuccess={handlePaymentSuccess} />
                    </Elements>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {plans.map((plan) => (
                      <PlanCard 
                        key={plan.id}
                        title={plan.title}
                        price={plan.price}
                        features={plan.features}
                        isCurrent={currentPlan === plan.id}
                        buttonText={plan.id === "basic" ? "Downgrade" : "Upgrade"}
                        onSelect={() => handleSelectPlan(plan.id)}
                      />
                    ))}
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-neutral-700 mb-3">Payment Method</h4>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-6 bg-blue-500 rounded mr-3 flex items-center justify-center text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2.5 3C1.67 3 1 3.67 1 4.5v15C1 20.33 1.67 21 2.5 21h19c.83 0 1.5-.67 1.5-1.5v-15c0-.83-.67-1.5-1.5-1.5h-19zm0 1.5h19v3h-19v-3zm0 4.5h19v9h-19v-9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Visa ending in 4242</p>
                        <p className="text-sm text-neutral-500">Expires 12/24</p>
                      </div>
                    </div>
                    <Button variant="ghost" className="text-sm text-primary-600 hover:text-primary-800">
                      Update
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="border-neutral-300 text-neutral-700"
                    >
                      <CreditCard className="w-4 h-4 mr-2" /> Change Payment Method
                    </Button>
                    <Button 
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-2" /> Cancel Subscription
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
