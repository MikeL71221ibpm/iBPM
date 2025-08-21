import React, { Suspense, useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ChartThemeProvider } from "@/context/ChartThemeContext";
import { useToast } from "@/hooks/use-toast";
import TopNav from "@/components/topnav-clean-reorganized";
import LoginButton from "@/components/LoginButton";
import { VersionDisplay } from "@/components/version-display";
import DraggableUserInterface from "@/components/DraggableUserInterface";
import NotFound from "@/pages/not-found";
import AppErrorBoundary from "@/components/app-error-boundary";
import Home from "@/pages/home-page-controlling-file-05_09_25";
import InstantHome from "@/pages/instant-home";
import AuthPage from "@/pages/auth-page-controlling-file-05_24_25";
import PaymentSuccessPage from "@/pages/payment-success";
import PaymentPage from "@/pages/payment-page-controlling-file-05_09_25";
import ReceiptPage from "@/pages/receipt-page-controlling-file-05_09_25";
import ReceiptsPage from "@/pages/receipts-page-controlling-file-05_09_25";
import ReceiptDetailPage from "@/pages/receipt-detail-controlling-file-05_10_25";
import UploadPage from "@/pages/upload-page-controlling-file-05_24_25";
import ProcessingCalculatorPage from "@/pages/processing-calculator";

import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AppContextProvider } from "@/context/AppContext";
import PopulationHealthPageV2 from "@/pages/Population_Health_Page_v2_05_23_25";
import PopulationHealthPageOptimized from "@/pages/Population_Health_Page_v2_05_23_25_OPTIMIZED";
import WidgetTestPage from "@/pages/widget-test-page";
import SearchPage from "@/pages/search-page";

import SimpleDemo from "@/pages/simple-demo";
import PopulationHealthDemo from "@/pages/population-health-demo";
import AllPivotsPage from "@/pages/all-pivots-page";
import HeatmapPage from "@/pages/heatmap-page";
import Heatmaps2Page from "@/pages/heatmaps2-page";
import BubbleChartsPage from "@/pages/bubble-charts-page";
import MultiUserDemoPage from "@/pages/multi-user-demo-page";
import AdminPage from "@/pages/admin-controlling-file";
import TestPage from "@/pages/test-page";
import TestSimple from "@/pages/test-simple";
import ChartCalculationTest from "@/components/ChartCalculationTest";
import PopulationHealthChartsFixed from "@/components/population-health-charts-fixed";
import ZipCodeMapPage from "@/pages/ZipCodeMapPage";
import DailyReportsPage from "@/pages/daily-reports-page-controlling-file-08_12_25";


function FixedChartsTest() {
  const { data, isLoading } = useQuery({ queryKey: ['/api/visualization-data'] });
  return <PopulationHealthChartsFixed data={data} isLoading={isLoading} />;
}

// Initialize Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

function Router() {
  return (
    <Switch>
      {/* Temporary test route to diagnose blank screen */}
      <Route path="/test" component={TestPage} />
      
      {/* Redirect old individual-search route to population health */}
      <Route path="/individual-search" component={() => {
        window.location.href = "/population-health";
        return null;
      }} />
      
      {/* NEW HRSN System Test Route */}

      
      {/* Root path - directs to population health page */}
      <Route path="/" component={PopulationHealthPageV2} />
      
      {/* Main Population Health route - SINGLE SOURCE OF TRUTH */}
      <Route path="/population-health" component={PopulationHealthPageV2} />
      

      
      {/* Authentication Page */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Register Page - routes to auth page with register tab */}
      <Route path="/register" component={AuthPage} />
      
      {/* Protected Home Route */}
      <Route path="/home" component={Home} />
      
      {/* File Upload Page */}
      <Route path="/upload" component={UploadPage} />
      
      {/* Daily Patient Reports */}
      <Route path="/daily-reports" component={DailyReportsPage} />
      
      {/* Admin Page */}
      <Route path="/admin" component={AdminPage} />
      
      {/* Processing Calculator */}
      <Route path="/processing-calculator" component={ProcessingCalculatorPage} />
      
      {/* Widget Test Page */}
      <Route path="/widget-test" component={WidgetTestPage} />
      
      {/* Simple Demo Page */}
      <Route path="/simple-demo" component={SimpleDemo} />
      
      {/* Population Health Demo */}
      <Route path="/population-health-demo" component={PopulationHealthDemo} />
      
      {/* Chart Calculation Test */}
      <Route path="/chart-test" component={ChartCalculationTest} />
      
      {/* Fixed Charts Test */}
      <Route path="/charts-fixed" component={FixedChartsTest} />
      

      

      
      {/* Chart Visualization Pages */}
      <Route path="/pivot-tables" component={AllPivotsPage} />
      <Route path="/direct-grid-view/:patientId?" component={AllPivotsPage} />
      {/* ARCHIVED: Original heatmaps - kept for existing bookmarks */}
      <Route path="/heatmaps" component={HeatmapPage} />
      <Route path="/nivo-heatmap-view/:patientId?" component={HeatmapPage} />
      {/* Enhanced Heatmaps (now called "Heatmaps" in navigation) */}
      <Route path="/heatmaps2" component={Heatmaps2Page} />
      <Route path="/heatmaps2/:patientId?" component={Heatmaps2Page} />
      <Route path="/bubble-charts" component={BubbleChartsPage} />
      <Route path="/bubble-charts/:patientId" component={BubbleChartsPage} />
      <Route path="/nivo-scatter-view-themed" component={BubbleChartsPage} />
      <Route path="/nivo-scatter-view-themed/:patientId" component={BubbleChartsPage} />
      
      {/* Keep only the routes that work with our existing components */}
      
      {/* Multi-User Demo */}
      <Route path="/multi-user-demo" component={MultiUserDemoPage} />
      
      {/* Multi-User Account Management */}
      <Route path="/multi-user-account-management" component={MultiUserDemoPage} />
      
      {/* Full Page ZIP Code Map */}
      <Route path="/map/zip-code-choropleth" component={ZipCodeMapPage} />
      
      {/* Billing and Payments */}
      <Route path="/payment" component={PaymentPage} />
      <Route path="/payment-success" component={PaymentSuccessPage} />
      <Route path="/receipt/:id" component={ReceiptPage} />
      <Route path="/receipts" component={ReceiptsPage} />
      <Route path="/receipt-detail/:id" component={ReceiptDetailPage} />
      
      {/* Fallback route - must be last */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Emergency Reset Button Component
function EmergencyResetButton() {
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  
  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all data? This will clear all patients, notes, and extracted symptoms.')) {
      return;
    }
    
    setIsResetting(true);
    
    // Show initial processing toast
    toast({
      title: "Processing Reset...",
      description: "Clearing all data from the database. Please wait...",
      duration: 10000,
    });
    
    try {
      const response = await fetch('/api/emergency-reset-bypass', {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Wait 2 seconds for database operations to complete
        setTimeout(() => {
          toast({
            title: "Reset Complete ✓",
            description: "All data has been cleared successfully. Database is now empty.",
            duration: 5000,
          });
          
          // Dispatch refresh event multiple times to ensure widget updates
          window.dispatchEvent(new Event('refresh-stats'));
          
          // Force refresh database stats by making a direct API call
          fetch('/api/database-stats', { credentials: 'include' })
            .then(res => res.json())
            .then(freshData => {
              console.log('✅ Fresh database stats after reset:', freshData);
              // Trigger another refresh event after API call completes
              window.dispatchEvent(new Event('refresh-stats'));
              
              // One more refresh after a short delay to ensure UI updates
              setTimeout(() => {
                window.dispatchEvent(new Event('refresh-stats'));
              }, 500);
            });
          
          setIsResetting(false);
        }, 2000);
      } else {
        toast({
          title: "Reset Failed",
          description: data.message || "Failed to reset data. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
        setIsResetting(false);
      }
    } catch (error) {
      toast({
        title: "Reset Error",
        description: "An error occurred while resetting. Please try again.",
        variant: "destructive", 
        duration: 5000,
      });
      setIsResetting(false);
    }
  };
  
  return (
    <div 
      className="fixed bottom-4 right-4 z-[9999]" 
      style={{ 
        position: 'fixed', 
        bottom: '16px', 
        right: '16px', 
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
    >
      <button
        onClick={handleReset}
        disabled={isResetting}
        className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded shadow-lg border-2 border-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: isResetting ? '#ef4444' : '#dc2626',
          color: 'white',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '600',
          borderRadius: '6px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '2px solid #991b1b',
          cursor: isResetting ? 'not-allowed' : 'pointer'
        }}
      >
        {isResetting ? 'Resetting...' : 'Emergency Reset'}
      </button>
    </div>
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
                    <DraggableUserInterface />
                    <div className="flex flex-col min-h-screen">
                      <TopNav />
                      
                      <div className="flex-1 pt-12"> {/* Reduced top padding to match our smaller navbar */}
                        <Suspense fallback={
                          <div className="flex items-center justify-center h-64 bg-white">
                            <div className="text-center">
                              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                              <p className="text-gray-600 text-sm">Loading component...</p>
                            </div>
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
                  <DraggableUserInterface />
                  <div className="flex flex-col min-h-screen">
                    <TopNav />
                    <div className="flex-1 pt-12"> {/* Reduced top padding for the fixed navbar */}
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-64 bg-white">
                          <div className="text-center">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                            <p className="text-gray-600 text-sm">Loading component...</p>
                          </div>
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