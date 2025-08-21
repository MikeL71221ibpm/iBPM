import React, { Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ChartThemeProvider } from "@/context/ChartThemeContext";
import TopNav from "@/components/topnav-clean-reorganized";
import LoginButton from "@/components/LoginButton";
import NotFound from "@/pages/not-found";
import AppErrorBoundary from "@/components/app-error-boundary";
import Home from "@/pages/home-page-controlling-file-05_09_25";
import AuthPage from "@/pages/auth-page-controlling-file-05_09_25";
import PaymentSuccessPage from "@/pages/payment-success";
import ReceiptPage from "@/pages/receipt-page-controlling-file-05_09_25";
import ReceiptsPage from "@/pages/receipts-page-controlling-file-05_09_25";
import ReceiptDetailPage from "@/pages/receipt-detail-controlling-file-05_10_25";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AppContextProvider } from "@/context/AppContext";
import PopulationHealthPageV2 from "@/pages/Population_Health_Page_v2_05_23_25";

// Initialize Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

function Router() {
  return (
    <Switch>
      {/* Main route directs to the authentication page */}
      <Route path="/" component={AuthPage} />
      
      {/* Main Population Health route - points to the v3.2 version */}
      <Route path="/population-health" component={PopulationHealthPageV2} />
      
      {/* New Population Health Page V2 - May 23 */}
      <Route path="/population-health-v2" component={PopulationHealthPageV2} />
      
      {/* Authentication Page */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Home Route */}
      <Route path="/home">
        <ProtectedRoute path="/home" component={Home} />
      </Route>
      
      {/* Billing and Payments */}
      <Route path="/payment-success" component={PaymentSuccessPage} />
      <Route path="/receipt/:id" component={ReceiptPage} />
      <Route path="/receipts" component={ReceiptsPage} />
      <Route path="/receipt-detail/:id" component={ReceiptDetailPage} />
      
      {/* Fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Setup Stripe provider if available
  const stripeProviderElement = stripePromise ? (
    <Elements stripe={stripePromise}>
      {/* Inner application content */}
      <div className="app-root" style={{ height: '100vh', overflowY: 'auto' }}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <AuthProvider>
              <AppContextProvider>
                <ChartThemeProvider>
                  <TooltipProvider>
                    <ScrollToTop />
                    <Toaster />
                    <div className="flex flex-col min-h-screen">
                      <TopNav />
                      <div className="flex-1 pt-12"> {/* Reduced top padding to match our smaller navbar */}
                        <Suspense fallback={
                          <div className="flex items-center justify-center h-screen">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                          </div>
                        }>
                          <Router />
                        </Suspense>
                      </div>
                    </div>
                  </TooltipProvider>
                </ChartThemeProvider>
              </AppContextProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </div>
    </Elements>
  ) : (
    // Fallback when Stripe is not available
    <div className="app-root" style={{ height: '100vh', overflowY: 'auto' }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <AuthProvider>
            <AppContextProvider>
              <ChartThemeProvider>
                <TooltipProvider>
                  <ScrollToTop />
                  <Toaster />
                  <div className="flex flex-col min-h-screen">
                    <TopNav />
                    <div className="flex-1 pt-12"> {/* Reduced top padding for the fixed navbar */}
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-screen">
                          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                        </div>
                      }>
                        <Router />
                      </Suspense>
                    </div>
                  </div>
                </TooltipProvider>
              </ChartThemeProvider>
            </AppContextProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </div>
  );
  
  // Wrap the entire app in error boundary
  return (
    <AppErrorBoundary>
      {stripeProviderElement}
    </AppErrorBoundary>
  );
}

export default App;