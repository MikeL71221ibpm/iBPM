import React, { Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ChartThemeProvider } from "@/context/ChartThemeContext";
import TopNav from "@/components/topnav-clean-reorganized";
import NavigationMenu from "@/components/navigation-menu";
import LoginButton from "@/components/LoginButton";
import NotFound from "@/pages/not-found";
import AppErrorBoundary from "@/components/app-error-boundary";

// CORE APPLICATION PAGES
import Home from "@/pages/home-page-controlling-file-05_09_25";
import AuthPage from "@/pages/auth-page-controlling-file-05_09_25";
import PaymentSuccessPage from "@/pages/payment-success";
import ReceiptPage from "@/pages/receipt-page-controlling-file-05_09_25";
import ReceiptsPage from "@/pages/receipts-page-controlling-file-05_09_25";
import ReceiptDetailPage from "@/pages/receipt-detail-controlling-file-05_10_25";
import UploadPage from "@/pages/upload-page-controlling-file-05_24_25";
import PaymentPage from "@/pages/payment-page-controlling-file-05_09_25";
import AdminPage from "@/pages/admin-page-controlling-file-05_09_25";
import BillingPage from "@/pages/billing-page-controlling-file-05_10_25";
import SearchPage from "@/pages/search-page-controlling-file-05_09_25";

// CORE V3.2 PAGES
import PopulationHealthPageV2 from "@/pages/Population_Health_Page_v2_05_23_25";
import PopulationHealthControlling from "@/pages/population-health-controlling-05_13_25";
import PopulationHealthUnified from "@/pages/population-health-unified-05_21_25";

// CORE VISUALIZATIONS
import NivoScatterViewThemed from "@/pages/nivo-scatter-view-controlling-file-05_09_25";
import NivoHeatmapView from "@/pages/nivo-heatmap-view-controlling-file-05_09_25";
import DirectGridView from "@/pages/direct-grid-view-controlling-file-05_09_25";
import HeatmapView from "@/pages/heatmap-view-controlling-file-05_09_25";
import SimplifiedAutoPivot from "@/pages/simplified-auto-pivot-controlling-file-05_09_25";

// Authentication and Stripe
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AppContextProvider } from "@/context/AppContext";

// Initialize Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.warn("Missing Stripe public key (VITE_STRIPE_PUBLIC_KEY). Stripe payments will not work.");
}

function Router() {
  return (
    <Switch>
      {/* Main route directs to the authentication page */}
      <Route path="/" component={AuthPage} />
      
      {/* Core v3.2 Population Health Routes */}
      <Route path="/v3" component={PopulationHealthControlling} />
      <Route path="/unified" component={PopulationHealthUnified} />
      <Route path="/population-health" component={PopulationHealthPageV2} />
      <Route path="/population-health-v2" component={PopulationHealthPageV2} />
      <Route path="/Population_Health_Page_v2_05_23_25" component={PopulationHealthPageV2} />
      
      {/* Core Application Routes */}
      <Route path="/logout" component={() => {
        // Simple logout component
        const LogoutComponent = () => {
          React.useEffect(() => {
            fetch('/api/logout', { method: 'POST' })
              .then(() => { window.location.href = '/'; })
              .catch(() => { window.location.href = '/'; });
          }, []);
          
          return <div className="flex h-screen items-center justify-center">Logging out...</div>;
        };
        
        return <LogoutComponent />;
      }} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/home" component={Home} />
      <Route path="/upload" component={UploadPage} />
      <Route path="/payment-success" component={PaymentSuccessPage} />
      <Route path="/payment" component={PaymentPage} />
      <Route path="/receipts" component={ReceiptsPage} />
      <Route path="/receipts/:id" component={ReceiptDetailPage} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/admin" component={AdminPage} />
      
      {/* Core Visualization Routes */}
      <Route path="/scatter-view" component={NivoScatterViewThemed} />
      <Route path="/heatmap-view" component={NivoHeatmapView} />
      <Route path="/grid-view" component={DirectGridView} />
      <Route path="/heat-view" component={HeatmapView} />
      <Route path="/pivot-view" component={SimplifiedAutoPivot} />
      
      {/* Catch All Route */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContextProvider>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <ChartThemeProvider>
              <TooltipProvider>
                <AppErrorBoundary>
                  <div className="min-h-screen bg-background font-sans antialiased">
                    <div className="relative flex min-h-screen flex-col">
                      <ScrollToTop />
                      {stripePromise ? (
                        <Elements stripe={stripePromise}>
                          <TopNav />
                          <div className="flex flex-col md:flex-row">
                            <NavigationMenu />
                            <main className="flex-1">
                              <Router />
                            </main>
                          </div>
                        </Elements>
                      ) : (
                        <>
                          <TopNav />
                          <div className="flex flex-col md:flex-row">
                            <NavigationMenu />
                            <main className="flex-1">
                              <Router />
                            </main>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </AppErrorBoundary>
              </TooltipProvider>
              <Toaster />
            </ChartThemeProvider>
          </ThemeProvider>
        </AppContextProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}