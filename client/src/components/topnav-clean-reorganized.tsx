import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Upload, 
  CreditCard, 
  Search, 
  LogOut,
  Settings,
  BarChart,
  PieChart,
  LineChart,
  LogIn,
  FileSpreadsheet,
  Circle,
  Users,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

// Clean Reorganized TopNav - Based on User Feedback
// Layout: [Logo] [Viz Tools Group] | [Main Functions] | [Admin] | [Auth - Locked Position]

export default function TopNavCleanReorganized() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Debug logging
  console.log('TopNav - User state:', user ? `Logged in as ${user.username}` : 'Not logged in');
  
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        // Redirect to auth page after successful logout
        window.location.href = '/auth';
      } else {
        console.error('Logout failed:', response.status);
        // Fallback: redirect to auth page even if logout fails
        window.location.href = '/auth';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: redirect to auth page on error
      window.location.href = '/auth';
    }
  };
  
  const isAdmin = user?.id === 1 || user?.id === 2;
  
  return (
    <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 shadow-sm">
      <div className="w-full max-w-full px-4">
        <div className="flex items-center justify-between h-14">
          
          {/* Logo + Visualization Tools Group (Left Side) */}
          <div className="flex items-center space-x-3">
            {/* Logo */}
            <Link href="/home">
              <span className="flex flex-col items-center cursor-pointer text-center">
                <span className="text-lg font-bold text-blue-600 leading-tight">HRSN + BH</span>
                <span className="text-sm font-medium text-blue-600 leading-tight">Analytics</span>
              </span>
            </Link>
            
            {/* Visualization Tools - Grouped Together (Individual Search Only) */}
            <div className="flex items-center space-x-0.5 pl-2">
              <Link href="/pivot-tables">
                <Button
                  variant={location === "/pivot-tables" ? "default" : "ghost"}
                  size="sm"
                  className="text-xs px-2 py-1 h-7 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="inline">Pivot Tables</span>
                </Button>
              </Link>
              
              <Link href="/heatmaps2">
                <Button
                  variant={location === "/heatmaps2" || location.startsWith("/heatmaps2/") ? "default" : "ghost"}
                  size="sm"
                  className="text-xs px-2 py-1 h-7 flex items-center gap-1.5"
                >
                  <BarChart className="w-3.5 h-3.5" />
                  <span className="inline">Heatmaps</span>
                </Button>
              </Link>
              
              <Link href="/bubble-charts">
                <Button
                  variant={location === "/bubble-charts" || location.startsWith("/bubble-charts/") || location.startsWith("/nivo-scatter-view-themed") ? "default" : "ghost"}
                  size="sm"
                  className="text-xs px-2 py-1 h-7 flex items-center gap-1.5"
                >
                  <Circle className="w-3.5 h-3.5" />
                  <span className="inline">Bubble Charts</span>
                </Button>
              </Link>
            </div>
            
            {/* Clean Separator - Shows these are Individual Search tools */}
            <div className="flex items-center mx-6">
              <div className="h-6 w-px bg-blue-600"></div>
              <div className="h-4 w-px bg-blue-500 ml-0.5"></div>
              <div className="h-2 w-px bg-blue-400 ml-0.5"></div>
            </div>
          </div>
          
          {/* Main Functions (Center-Left) */}
          <div className="flex items-center space-x-1">
            <Link href="/home">
              <Button
                variant={location === "/home" ? "default" : "ghost"}
                size="sm"
                className="text-sm px-3 py-1.5 h-9 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span className="inline">Search</span>
              </Button>
            </Link>
            
            <Link href="/population-health">
              <Button
                variant={location === "/population-health" ? "default" : "ghost"}
                size="sm"
                className="text-sm px-3 py-1.5 h-9 flex items-center gap-2"
              >
                <LineChart className="w-4 h-4" />
                <span className="inline">Population Health</span>
              </Button>
            </Link>
            
            <Link href="/upload">
              <Button
                variant={location === "/upload" ? "default" : "ghost"}
                size="sm"
                className="text-sm px-3 py-1.5 h-9 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span className="inline">Upload Data</span>
              </Button>
            </Link>
            
            <Link href="/daily-reports">
              <Button
                variant={location === "/daily-reports" ? "default" : "ghost"}
                size="sm"
                className="text-sm px-3 py-1.5 h-9 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span className="inline">Daily Reports</span>
              </Button>
            </Link>
          </div>
          
          {/* Admin + Auth (Right Side - Locked Position) */}
          <div className="flex items-center space-x-1">
            {/* Admin Functions */}
            <Link href="/receipts">
              <Button
                variant={location === "/receipts" ? "default" : "ghost"}
                size="sm"
                className="text-sm px-3 py-1.5 h-9 flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span className="inline">Billing</span>
              </Button>
            </Link>
            
            <Link href="/admin">
              <Button
                variant={location === "/admin" ? "default" : "ghost"}
                size="sm"
                className="text-sm px-3 py-1.5 h-9 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span className="inline">Admin</span>
              </Button>
            </Link>
            
            {/* Divider */}
            <div className="h-6 w-px bg-gray-300 mx-2" />
            
            {/* Auth - Locked in exact position */}
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-sm px-3 py-1.5 h-9 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="inline">Logout</span>
              </Button>
            ) : (
              <Link href="/auth">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm px-3 py-1.5 h-9 flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="inline">Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}