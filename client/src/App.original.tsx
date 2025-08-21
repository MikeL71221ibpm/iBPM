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
import RedirectToHeatmap from "@/pages/redirect-to-heatmap";
import PopulationHealthControlling from "@/pages/population-health-controlling-05_13_25";
import PopulationHealthPercentageView from "@/pages/population-health-percentage-view-05_15_25";
import PopulationHealthPercentageFixed from "@/pages/population-health-percentage-fixed";
import PopulationHealthFixedAllCharts from "@/pages/population-health-fixed-all-charts";
import PopulationHealthUnified from "@/pages/population-health-unified-05_21_25";
import PopulationHealthPageV2 from "@/pages/Population_Health_Page_v2_05_23_25";
import FixedCharts05_21_25 from "@/pages/fixed-charts-05_21_25";
import FixedCharts05_22_25 from "@/pages/fixed-charts-05_22_25";
import ChartFullpageDemo from "@/pages/chart-fullpage-demo";
import PopulationHealthWithExports from "@/pages/population-health-with-exports";
// Removed PopulationHealthV31 component import
import May10TestPage from "@/pages/may10-test-page";
import May10PopulationHealthPage from "@/pages/may10-population-health";
import WorkingMay10Version from "@/pages/may10-working-version";
import May10OriginalViewer from "@/pages/may10-original-viewer";
// Import version control configuration
import { appVersionConfig } from "@/config/version-control";
// Emergency recovery link is now handled by the emergency-button.js script

// Initialize Stripe
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.warn("Missing Stripe public key (VITE_STRIPE_PUBLIC_KEY). Stripe payments will not work.");
}

// Import pages
import UploadPage from "@/pages/upload-page-controlling-file-05_24_25";
import PaymentPage from "@/pages/payment-page-controlling-file-05_09_25";
import AdminPage from "@/pages/admin-page-controlling-file-05_09_25";
import BillingPage from "@/pages/billing-page-controlling-file-05_10_25";
import SearchPage from "@/pages/search-page-controlling-file-05_09_25";
import SampleReceiptViewer from "@/pages/sample-receipt-viewer";
import AdminDirectPage from "@/pages/admin-direct";
import PivotTablePage from "@/pages/PivotTablePage";
import HeatmapVisualizationPage from "@/pages/HeatmapVisualizationPage";
import SimplePivotVisual from "@/pages/SimplePivotVisual";
import HeatmapPage from "@/pages/HeatmapPage";
import AdminSetupPage from "@/pages/admin-setup";
import DirectLoginPage from "@/pages/direct-login";
import VisualizerPage from "@/pages/visualizer-page";
import SimplePivotChartPage from "@/pages/simple-pivot-chart-page";
import ExcelChartPage from "@/pages/excel-chart-page";
import AutoPivotPage from "@/pages/auto-pivot-page";
import AllPivotsPage from "@/pages/all-pivots-page";
import SimplifiedAutoPivot from "@/pages/simplified-auto-pivot-controlling-file-05_09_25";
import FullPatientVisualization from "@/pages/full-patient-visualization";
import FullPatientVisualizationFixed from "@/pages/full-patient-visualization-fixed";
import FixedSimpleVisualization from "@/pages/fixed-simple-visualization";
import VerySimpleHeatmap from "@/pages/very-simple-heatmap";
import RollbackVisualization from "@/pages/rollback-visualization";
import FixedPivotNew from "@/pages/fixed-pivot-new";
import HardCodedPivotPage from "@/pages/hard-coded-pivot";
import AutoPivotHeatmaps from "@/pages/auto-pivot-heatmaps";
import PivotTablesWithDownload from "@/pages/pivot-tables-with-download";
import GridPivotView from "@/pages/grid-pivot-view";
import DirectGridView from "@/pages/direct-grid-view-controlling-file-05_09_25";
import HeatmapView from "@/pages/heatmap-view-controlling-file-05_09_25";
import NivoHeatmapView from "@/pages/nivo-heatmap-view-controlling-file-05_09_25";
import NivoHeatmapViewFixed from "@/pages/nivo-heatmap-view-fixed";
import NivoBubbleView from "@/pages/nivo-bubble-view";
import NivoScatterView from "@/pages/nivo-scatter-view";
import DirectScatterView from "@/pages/direct-scatter-view";
import DirectScatterViewThemed from "@/pages/direct-scatter-view-themed";
import NivoScatterViewThemed from "@/pages/nivo-scatter-view-controlling-file-05_09_25";
// Import for ThemedVisualizationFixed was removed
import ThemedVisualizationNew from "@/pages/themed-visualization-new";
import ThemedVisualizationFixedNew from "@/pages/themed-visualization-fixed-new";
import BubbleSizeDemo from "@/pages/bubble-size-demo";
import NivoScatterThemedColors from "@/pages/nivo-scatter-themed-colors";
import NivoThemedRowColors from "@/pages/nivo-themed-row-colors";
import SimpleBubbleChart from "@/pages/simple-bubble-chart";
import TestColorScatter from "@/pages/test-color-scatter";
import ExportDemoWorking from "@/pages/export-demo-working";
import SimpleExportDemo from "@/pages/simple-export-demo";
import NivoBasicColors from "@/pages/nivo-basic-colors";
import NivoNodeColor from "@/pages/nivo-node-color";
import NivoDirectTheme from "@/pages/nivo-direct-theme";
import NivoColoredBubbles from "@/pages/nivo-colored-bubbles";
import NivoMultiSeries from "@/pages/nivo-multi-series";
import NivoRowColors from "@/pages/nivo-row-colors";
import NivoThemedRowColorsFixed from "@/pages/nivo-themed-row-colors-fixed";
import TestDashboard from "@/pages/test-dashboard";
import VisualizationDashboard from "@/pages/visualization-dashboard";
import EnhancedHeatmapView from "@/pages/enhanced-heatmap";
import EnhancedHeatmapViewV2 from "@/pages/enhanced-heatmap-view-fixed";
// Import the simplified themed bubble chart
import SimpleThemedBubbleChart from "@/pages/simple-themed-bubble-chart";
import BubbleChartSimpleFix from "@/pages/bubble-chart-simple-fix";
import ThemedBubbleChartDirect from "@/pages/themed-bubble-chart-direct";
import ThemedBubbleChartDirectFixed from "@/pages/themed-bubble-chart-direct-fixed";
import BubbleChartThemed from "@/pages/bubble-chart-themed-new";
import DirectBubbleChartNew from "@/pages/direct-bubble-chart-new";
import SimpleBubbleChartFixed from "@/pages/simple-bubble-chart-fixed";
import BubbleChartThemedDemo from "@/pages/bubble-chart-themed-demo";
import TempPopulationHealthCharts from "@/pages/temp-population-health-charts-for-review";

function Router() {
  return (
    <Switch>
      {/* Main route directs to the authentication page */}
      <Route path="/" component={AuthPage} />
      
      {/* Alternative route for direct access to v3 only (for comparison) */}
      <Route path="/v3" component={PopulationHealthControlling} />
      
      {/* Unified version with standardized export functionality - May 21 */}
      <Route path="/unified" component={PopulationHealthUnified} />
      
      {/* Main Population Health route - points to the v3.2 version */}
      <Route path="/population-health" component={PopulationHealthPageV2} />
      
      {/* New Population Health Page V2 - May 23 */}
      <Route path="/population-health-v2" component={PopulationHealthPageV2} />
      {/* Additional route with uppercase (for compatibility) */}
      <Route path="/Population_Health_Page_v2_05_23_25" component={PopulationHealthPageV2} />
      
      {/* Export-fixed version with floating export buttons - May 23 */}
      <Route path="/population-health-v2-export-fix" component={React.lazy(() => import('./pages/population-health-v2-export-fix'))} />
      
      {/* Simple export demo with no dependencies - May 23 */}
      <Route path="/export-demo" component={React.lazy(() => import('./pages/export-demo'))} />
      
      {/* Enhanced export button demo with Population Health charts - May 23 */}
      <Route path="/export-enhanced" component={React.lazy(() => import('./pages/population-health-export-demo'))} />
      
      {/* Population Health Export Demo with high-visibility buttons - May 23 */}
      <Route path="/population-health-export-demo" component={React.lazy(() => import('./pages/population-health-export-demo'))} />
      
      {/* Simple Export Widget Demo with just the widget functionality - May 23 */}
      <Route path="/export-widget-demo" component={React.lazy(() => import('./pages/export-widget-demo'))} />
      
      {/* Ultra-simple export buttons demo - May 23 */}
      <Route path="/simple-export-buttons" component={React.lazy(() => import('./pages/simple-export-buttons'))} />
      
      {/* Expanded view export buttons demo - May 23 */}
      <Route path="/expanded-export-demo" component={React.lazy(() => import('./pages/expanded-export-demo'))} />
      
      {/* Ultra-simple export buttons demo (no dependencies) - May 23 */}
      <Route path="/export-buttons-simple" component={React.lazy(() => import('./pages/export-buttons-simple'))} />
      
      {/* Static HTML export demo (zero dependencies) - May 23 */}
      <Route path="/export-static" component={React.lazy(() => import('./pages/export-static'))} />
      
      {/* Simple buttons demo - direct component no lazy loading */}
      <Route path="/buttons-demo" component={React.lazy(() => import('./pages/buttons-demo'))} />
      
      {/* Ultra-quick export buttons demo - zero dependencies - May 23 */}
      <Route path="/export-quick" component={React.lazy(() => import('./pages/export-quick'))} />
      
      {/* Plainest possible export buttons demo - zero dependencies - May 23 */}
      <Route path="/simple-demo" component={React.lazy(() => import('./pages/simple-demo'))} />
      
      {/* Export Test Page with direct implementation - May 23 */}
      <Route path="/export-test" component={React.lazy(() => import('./pages/export-test'))} />
      
      {/* Direct no-dependencies version with export buttons */}
      <Route path="/direct-export" component={React.lazy(() => import('./pages/direct-export-demo'))} />
      
      {/* Ultra simple export demo with zero dependencies */}
      <Route path="/simple-export" component={() => <SimpleExportDemo />} />
      
      {/* Chart Export Demo - doesn't require database connection */}
      <Route path="/chart-demo" component={May10TestPage} />
      
      {/* Fixed charts route - May 22 version (preferred implementation) */}
      <Route path="/fixed-charts-05-22" component={FixedCharts05_22_25} />
      <Route path="/population-health/fixed-charts-05-22" component={FixedCharts05_22_25} />
      
      {/* Percentage view routes */}
      <Route path="/population-health-percentage" component={PopulationHealthPercentageView} />
      <Route path="/percentage-view" component={PopulationHealthPercentageView} />
      <Route path="/percentage-fixed" component={PopulationHealthPercentageFixed} />
      <Route path="/fixed-all-charts" component={PopulationHealthFixedAllCharts} />
      <Route path="/fixed-percentage">
        <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
          {React.createElement(React.lazy(() => import('./pages/fixed-percentage-display')))}
        </React.Suspense>
      </Route>
      <Route path="/fixed-charts">
        <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
          {React.createElement(React.lazy(() => import('./pages/fixed-charts-05_21_25')))}
        </React.Suspense>
      </Route>
      <Route path="/fixed-charts-05_21_25" component={FixedCharts05_21_25} />
      <Route path="/fixed-charts-05_22_25" component={FixedCharts05_22_25} />
      <Route path="/chart-fullpage-demo" component={ChartFullpageDemo} />
      {/* Route for population-health-charts with category selector */}
      <Route path="/population-health-charts-05_23_25" component={React.lazy(() => import('./pages/population-health-charts-05_23_25'))} />
      
      {/* Demo for category selector component */}
      <Route path="/category-selector-demo" component={React.lazy(() => import('./pages/category-selector-demo'))} />
      
      {/* Export functionality demo */}
      <Route path="/export-demo-working" component={ExportDemoWorking} />
      
      {/* Simple export demo with directly visible buttons */}
      <Route path="/simple-export-demo" component={SimpleExportDemo} />
      
      {/* Route removed as requested */}
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
      <Route path="/admin-direct" component={AdminDirectPage} />
      <Route path="/sample-receipt" component={SampleReceiptViewer} />
      <Route path="/admin-setup" component={AdminSetupPage} />
      <Route path="/heatmap-redirect" component={RedirectToHeatmap} />
      
      {/* Direct access to pivot table data (no auth required) */}
      <Route path="/pivot-tables" component={PivotTablePage} />
      
      {/* Simplified pivot table visualization (no auth required) */}
      <Route path="/visualize/:patientId?" component={SimplePivotVisual} />
      
      {/* Interactive heatmap visualization page */}
      <ProtectedRoute path="/heatmap/:patientId?" component={HeatmapPage} />
      
      {/* Legacy heatmap visualization page (auth required) */}
      <ProtectedRoute path="/heatmaps" component={HeatmapVisualizationPage} />
      
      {/* Enhanced visualizer for pivot tables */}
      <Route path="/visualizer" component={VisualizerPage} />
      
      {/* Simple Excel-like pivot chart tool */}
      <Route path="/simple-chart" component={SimplePivotChartPage} />
      
      {/* Direct Excel-style chart for pivot tables */}
      <Route path="/excel-chart" component={ExcelChartPage} />
      
      {/* Automatic pivot charts with heatmaps/bar charts */}
      <Route path="/auto-pivot/:patientId?" component={AutoPivotPage} />
      
      {/* All-in-one pivot table visualizations with copy-paste */}
      <Route path="/all-pivots" component={AllPivotsPage} />
      
      {/* Simplified auto pivot with reliable visualization */}
      <Route path="/simplified-auto-pivot/:patientId?" component={SimplifiedAutoPivot} />
      
      {/* All-in-one patient visualization page with auto-loading charts */}
      <Route path="/patient-visualization/:patientId?" component={FullPatientVisualization} />
      
      {/* Fixed patient visualization with improved bubble charts */}
      <Route path="/fixed-visualization/:patientId?" component={FullPatientVisualizationFixed} />
      
      {/* Simple fixed visualization with improved date labels */} 
      <Route path="/simple-fixed/:patientId?" component={FixedSimpleVisualization} />
      
      {/* Very simple heatmap with no fancy features */}
      <Route path="/simple-heatmap/:patientId?" component={VerySimpleHeatmap} />
      
      {/* Rollback version with improved date labels */}
      <Route path="/rollback-viz/:patientId?" component={RollbackVisualization} />
      
      {/* New fixed pivot implementation */}
      <Route path="/fixed-pivot-new/:patientId?" component={FixedPivotNew} />
      
      {/* Hard-coded DOM manipulation pivot table */}
      <Route path="/hard-coded-pivot/:patientId?" component={HardCodedPivotPage} />
      
      {/* New heatmap and bubble chart visualization with download feature */}
      <Route path="/heatmaps-with-download/:patientId?" component={AutoPivotHeatmaps} />
      
      {/* Pivot tables with download options */}
      <Route path="/pivot-tables-with-download/:patientId?" component={PivotTablesWithDownload} />
      
      {/* Grid layout of pivot tables for better overview */}
      <Route path="/grid-pivot-view/:patientId?" component={GridPivotView} />
      
      {/* Direct 2x2 grid view of all pivot tables */}
      <Route path="/direct-grid-view/:patientId?" component={DirectGridView} />
      
      {/* Heatmap visualization of all pivot data */}
      <Route path="/heatmap-view/:patientId?" component={HeatmapView} />
      
      {/* Nivo heatmap visualization with better controls */}
      <Route path="/nivo-heatmap-view/:patientId?" component={NivoHeatmapView} />
      
      {/* Fixed Nivo heatmap with proper error handling */}
      <Route path="/nivo-heatmap-view-fixed/:patientId?" component={NivoHeatmapViewFixed} />
      
      {/* Nivo bubble chart visualization of frequency data */}
      <Route path="/nivo-bubble-view/:patientId?" component={NivoBubbleView} />
      
      {/* Custom SVG-based scatter plot visualization */}
      <Route path="/direct-scatter-view/:patientId?" component={DirectScatterView} />
      
      {/* Themed SVG-based scatter plot with color scheme options */}
      <Route path="/direct-scatter-view-themed/:patientId?" component={DirectScatterViewThemed} />
      
      {/* PRIMARY BUBBLE CHART ROUTE - Standardized controlling file */}
      <Route path="/nivo-scatter-view/:patientId?" component={NivoScatterViewThemed} />
      
      {/* Legacy route - redirects to primary route above */}
      <Route path="/nivo-scatter-view-legacy/:patientId?">
        {(params) => <Redirect to={`/nivo-scatter-view/${params.patientId || ''}`} />}
      </Route>
      
      {/* New themed scatter plot with proper color scheme implementation */}
      <Route path="/nivo-scatter-themed-colors/:patientId?" component={NivoScatterThemedColors} />
      
      {/* Legacy route - redirects to primary route above */}
      <Route path="/nivo-scatter-view-themed/:patientId?">
        {(params) => <Redirect to={`/nivo-scatter-view/${params.patientId || ''}`} />}
      </Route>
      
      {/* Legacy route - redirects to primary route above */}
      <Route path="/nivo-scatter-view-themed-new-colors-fixed/:patientId?">
        {(params) => <Redirect to={`/nivo-scatter-view/${params.patientId || ''}`} />}
      </Route>
      
      {/* Simple bubble chart with direct rendering for testing */}
      <Route path="/simple-bubble-chart/:patientId?" component={SimpleBubbleChart} />
      
      {/* Test component for color scatter plot */}
      <Route path="/test-color-scatter" component={TestColorScatter} />
      
      {/* Test component with basic Nivo color implementations */}
      <Route path="/nivo-basic-colors" component={NivoBasicColors} />
      
      {/* Test component using node-level rendering for colors */}
      <Route path="/nivo-node-color" component={NivoNodeColor} />
      
      {/* Direct theme implementation for Nivo scatter plots */}
      <Route path="/nivo-direct-theme/:patientId?" component={NivoDirectTheme} />
      
      {/* Test component showing colored bubbles in Nivo */}
      <Route path="/colored-bubbles" component={NivoColoredBubbles} />
      
      {/* Multi-series test component with proper intensity-based colors */}
      <Route path="/nivo-multi-series/:patientId?" component={NivoMultiSeries} />
      
      {/* Row-colored bubble chart (each row has its own color) */}
      <Route path="/nivo-row-colors/:patientId?" component={NivoRowColors} />
      
      {/* New themed row-colored bubble chart with theme selector */}
      <Route path="/nivo-themed-row-colors/:patientId?" component={NivoThemedRowColors} />
      
      {/* Fixed version with expanded view and export options */}
      <Route path="/nivo-themed-row-colors-fixed/:patientId?" component={NivoThemedRowColorsFixed} />
      
      {/* Test Dashboard for monitoring application performance */}
      <Route path="/test-dashboard" component={TestDashboard} />
      
      {/* Bubble size demonstration page */}
      <Route path="/bubble-size-demo" component={BubbleSizeDemo} />
      
      {/* Integrated visualization dashboard with bubble charts, heatmaps, and pivot tables */}
      <Route path="/visualization-dashboard/:patientId?" component={VisualizationDashboard} />
      
      {/* Enhanced heatmap view with theme selection and export options */}
      <Route path="/enhanced-heatmap-v2/:patientId?" component={EnhancedHeatmapViewV2} />
      
      {/* New themed scatter plot with proper color scheme implementation */}
      <Route path="/nivo-scatter-themed-colors/:patientId?" component={NivoScatterThemedColors} />
      
      {/* This route was removed (ThemedVisualizationFixed) */}
      
      {/* NEW FIXED IMPLEMENTATION with working global theme - USE THIS VERSION (no auth) */}
      <Route path="/themed-visualization-new/:patientId?" component={ThemedVisualizationNew} />
      
      {/* COMPLETELY REWRITTEN VERSION with robust theme handling */}
      <Route path="/themed-visualization-fixed-new/:patientId?" component={ThemedVisualizationFixedNew} />
      
      {/* SIMPLE VERSION WITH DIRECT COLOR FIX */}
      <Route path="/bubble-chart-simple-fix/:patientId?" component={BubbleChartSimpleFix} />
      
      {/* ULTRA SIMPLIFIED VERSION WITH DIRECT COLOR MAPPING */}
      <Route path="/themed-bubble-chart-direct/:patientId?" component={ThemedBubbleChartDirect} />
      
      {/* FIXED VERSION WITH DIRECT COLOR APPLICATION */}
      <Route path="/themed-bubble-chart-direct-fixed/:patientId?" component={ThemedBubbleChartDirectFixed} />
      
      {/* REWRITTEN VERSION WITH PROPER THEME SUPPORT */}
      <Route path="/bubble-chart-themed-new/:patientId?" component={BubbleChartThemed} />
      
      {/* DIRECT SVG IMPLEMENTATION WITH MANUAL CONTROL */}
      <Route path="/direct-bubble-chart-new/:patientId?" component={DirectBubbleChartNew} />
      
      {/* CLEAN SIMPLIFIED IMPLEMENTATION WITH DIRECT COLOR SUPPORT */}
      <Route path="/simple-bubble-chart-fixed/:patientId?" component={SimpleBubbleChartFixed} />
      
      {/* NEW DEMO WITH THEME SUPPORT */}
      <Route path="/bubble-chart-themed-demo/:patientId?" component={BubbleChartThemedDemo} />
      
      <Route path="/auth" component={AuthPage} />
      
      {/* This route has been moved to the top - now using PopulationHealthPageV2 as official version */}
      
      {/* Unified population health page with fixed toggle functionality - May 21, 2025 */}
      <Route path="/unified" component={PopulationHealthUnified} />
      
      {/* New page with fixed charts implementation - May 21, 2025 */}
      <Route path="/fixed-charts" component={FixedCharts05_21_25} />
      
      {/* Redirect all legacy comparison pages to the main population health page */}
      <Route path="/may10-test">
        <Redirect to="/population-health" />
      </Route>
      <Route path="/may10-population-health">
        <Redirect to="/population-health" />
      </Route>
      <Route path="/may10-working">
        <Redirect to="/population-health" />
      </Route>
      <Route path="/may10-original">
        <Redirect to="/population-health" />
      </Route>
      
      {/* Redirect legacy May 12 URLs */}
      <Route path="/may12-working">
        <Redirect to="/population-health" />
      </Route>
      <Route path="/may12-original">
        <Redirect to="/population-health" />
      </Route>
      <Route path="/may12-test">
        <Redirect to="/population-health" />
      </Route>
      <Route path="/may12-population-health">
        <Redirect to="/population-health" />
      </Route>
      
      {/* Temporary review page for population health charts */}
      <Route path="/temp-review" component={TempPopulationHealthCharts} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Add error handling for unhandled promise rejections
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Prevent the default browser behavior which might show error dialogs
      event.preventDefault();
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
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
                    <div className="flex-1 pt-16"> {/* Added 16 pixels of top padding for the fixed navbar */}
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
