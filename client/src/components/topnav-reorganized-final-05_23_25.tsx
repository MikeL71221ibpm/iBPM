import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Upload, 
  CreditCard, 
  Search, 
  LogOut,
  Settings,
  BarChart,
  LineChart,
  LogIn,
  FileSpreadsheet,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Final Reorganized TopNav - May 23, 2025
// Layout: [Logo] [Viz Tools Group] | [Clean Separator] | [Main Functions] | [Admin] | [Auth]
// ✓ Visualization tools grouped left (Individual Search only)
// ✓ Clean gradient separator showing functional distinction  
// ✓ Main functions centered
// ✓ Admin functions grouped right
// ✓ Auth locked in position

export default function TopNavReorganizedFinal() {
  const [location] = useLocation();
  
  const user = { id: 2, username: "admin" }; // Mock for preview
  
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = "/logout";
  };
  
  const isAdmin = user?.id === 1 || user?.id === 2;
  
  return (
    <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="w-full max-w-full px-2">
        <div className="flex items-center justify-between h-12">
          
          {/* Logo + Visualization Tools Group (Left Side) */}
          <div className="flex items-center space-x-2">
            {/* Logo */}
            <Link href="/home">
              <span className="flex flex-col items-center cursor-pointer">
                <span className="text-lg font-bold text-primary leading-tight">HRSN + BH</span>
                <span className="text-sm font-medium text-primary leading-tight">Analytics</span>
              </span>
            </Link>
            
            {/* Visualization Tools - Grouped Together (Individual Search Only) */}
            <div className="flex items-center space-x-1 pl-2">
              <Link href="/simplified-auto-pivot">
                <Button
                  variant={location === "/simplified-auto-pivot" ? "default" : "ghost"}
                  size="sm"
                  className="text-xs px-2 py-1 h-8 flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pivot Tables</span>
                </Button>
              </Link>
              
              <Link href="/enhanced-heatmap-v2/1">
                <Button
                  variant={location.startsWith("/enhanced-heatmap") ? "default" : "ghost"}
                  size="sm"
                  className="text-xs px-2 py-1 h-8 flex items-center gap-1"
                >
                  <BarChart className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Heatmaps</span>
                </Button>
              </Link>
              
              <Link href="/nivo-scatter-view-themed/1">
                <Button
                  variant={location.startsWith("/nivo-scatter") ? "default" : "ghost"}
                  size="sm"
                  className="text-xs px-2 py-1 h-8 flex items-center gap-1"
                >
                  <Circle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bubble Charts</span>
                </Button>
              </Link>
            </div>
            
            {/* Clean Separator - Shows these are Individual Search tools */}
            <div className="flex items-center mx-3">
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
                className="text-xs px-2 py-1 h-8 flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Search</span>
              </Button>
            </Link>
            
            <Link href="/population-health">
              <Button
                variant={location === "/population-health" ? "default" : "ghost"}
                size="sm"
                className="text-xs px-2 py-1 h-8 flex items-center gap-1"
              >
                <LineChart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Population Health</span>
              </Button>
            </Link>
            
            <Link href="/upload">
              <Button
                variant={location === "/upload" ? "default" : "ghost"}
                size="sm"
                className="text-xs px-2 py-1 h-8 flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload Data</span>
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
                className="text-xs px-2 py-1 h-8 flex items-center gap-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Billing</span>
              </Button>
            </Link>
            
            {isAdmin && (
              <Link href="/admin">
                <Button
                  variant={location === "/admin" ? "default" : "ghost"}
                  size="sm"
                  className="text-xs px-2 py-1 h-8 flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}
            
            {/* Divider */}
            <div className="h-6 w-px bg-gray-300 mx-2" />
            
            {/* Auth - Locked in exact position */}
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-xs px-2 py-1 h-8 flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            ) : (
              <Link href="/auth">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs px-2 py-1 h-8 flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}