import React from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Upload, 
  CreditCard, 
  Search, 
  Receipt, 
  LogOut,
  Settings,
  BarChart,
  PieChart,
  LineChart,
  UserPlus,
  LogIn,
  FileSpreadsheet,
  Circle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

// Last updated: August 3, 2025 - 10:07 PM
// Controls component: TopNav - horizontal navigation bar for the application
// Note: Updated to use actual authentication system with proper session management

export default function TopNav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!user && location !== '/login' && location !== '/register' && location !== '/') {
      window.location.href = '/login';
    }
  }, [user, location]);
  
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logoutMutation.mutate();
  };
  
  // Check if user is admin (ID 1 or 2)
  const isAdmin = user?.id === 1 || user?.id === 2;
  
  const navItems = [
    {
      title: "Search",
      href: "/home",
      icon: <Search className="w-3.5 h-3.5" />
    },
    {
      title: "Population Health",
      href: "/population-health",
      icon: <LineChart className="w-3.5 h-3.5" />
    },
    {
      title: "Upload Data",
      href: "/upload",
      icon: <Upload className="w-3.5 h-3.5" />
    },
    {
      title: "Daily Reports",
      href: "/daily-reports",
      icon: <FileText className="w-3.5 h-3.5" />
    },
    {
      title: "Pivot Tables",
      href: "/simplified-auto-pivot",
      icon: <BarChart className="w-3.5 h-3.5" />
    },
    {
      title: "Heatmaps",
      href: "/heatmaps",
      icon: <BarChart className="w-3.5 h-3.5" />
    },
    {
      title: "Bubble Charts",
      href: "/nivo-scatter-view-themed/1",
      icon: <PieChart className="w-3.5 h-3.5" />
    },
    {
      title: "Billing",
      href: "/receipts",
      icon: <CreditCard className="w-3.5 h-3.5" />
    },
    ...(isAdmin ? [
      {
        title: "Admin",
        href: "/admin",
        icon: <Settings className="w-3.5 h-3.5" />
      }
    ] : [])
  ];
  
  return (
    <>
      <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50" style={{ width: '100%' }}>
        <div className="w-full max-w-full px-1">
          <div className="flex items-center justify-between h-12">
            {/* Logo area */}
            <div className="flex items-center flex-shrink-0">
              <Link href="/home">
                <span className="flex flex-col items-center cursor-pointer mr-2">
                  <span className="text-lg font-bold text-primary leading-tight">HRSN + BH</span>
                  <span className="text-sm font-medium text-primary leading-tight">Analytics</span>
                </span>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="flex items-center space-x-1 flex-grow justify-start ml-16">
              
              {/* Protected nav items only shown when logged in */}
              {user && navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <span
                    className={cn(
                      "px-1.5 py-1 rounded-md text-xs font-medium flex items-center cursor-pointer",
                      (location === item.href || 
                       (item.title === "Heatmaps" && (location.startsWith("/heatmaps") || location.startsWith("/nivo-heatmap-view") || location.startsWith("/enhanced-heatmap"))) ||
                       (item.title === "Pivot Tables" && (location.startsWith("/pivot-tables") || location.startsWith("/direct-grid-view") || location.startsWith("/simplified-auto-pivot"))) ||
                       (item.title === "Bubble Charts" && (location.startsWith("/bubble-charts") || location.startsWith("/nivo-scatter-view"))))
                        ? "bg-primary/10 text-primary" 
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="truncate">{item.title}</span>
                  </span>
                </Link>
              ))}
            </div>
            
            {/* Auth buttons on the far right */}
            <div className="flex items-center">
              {/* Logout button if user is logged in */}
              {user && (
                <button
                  onClick={handleLogout}
                  className="px-2 py-1 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Logout
                </button>
              )}
              
              {/* Sign In button on same line with negative margin to pull left */}
              <a 
                href="/" 
                className="px-1.5 py-1 rounded-md text-xs font-medium flex items-center cursor-pointer text-gray-700 hover:bg-gray-100 -ml-10"
                style={{ marginLeft: "-8px" }}
              >
                <LogIn className="w-3.5 h-3.5 mr-1" />
                Sign In
              </a>
            </div>
            
            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center space-x-2">
              
              {/* Logout button if user is logged in on mobile */}
              {user && (
                <button
                  onClick={handleLogout}
                  className="p-1 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
              
              {/* Always show Sign In button with consistent styling on mobile */}
              <a
                href="/"
                className="p-1 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}