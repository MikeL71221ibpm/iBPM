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
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// PREVIEW: Reorganized TopNav based on user feedback
// Grouping: [Visualization Tools] | [Main Functions] | [Admin Functions] | [Auth]

export default function TopNavReorganizedPreview() {
  const [location] = useLocation();
  
  const user = { id: 2, username: "admin" }; // Mock for preview
  
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = "/logout";
  };
  
  const isAdmin = user?.id === 1 || user?.id === 2;
  
  // Reorganized navigation groups
  const visualizationTools = [
    {
      title: "Pivot Tables",
      href: "/simplified-auto-pivot",
      icon: <FileSpreadsheet className="w-3.5 h-3.5" />
    },
    {
      title: "Heatmaps",
      href: "/enhanced-heatmap-v2/1",
      icon: <BarChart className="w-3.5 h-3.5" />
    },
    {
      title: "Bubble Charts",
      href: "/nivo-scatter-view-themed/1",
      icon: <Circle className="w-3.5 h-3.5" />
    }
  ];
  
  const mainFunctions = [
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
    }
  ];
  
  const adminFunctions = [
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
  
  const NavGroup = ({ items, className = "" }: { items: any[], className?: string }) => (
    <div className={cn("flex items-center space-x-1", className)}>
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant={location === item.href ? "default" : "ghost"}
            size="sm"
            className="text-xs px-2 py-1 h-8 flex items-center gap-1"
          >
            {item.icon}
            <span className="hidden sm:inline">{item.title}</span>
          </Button>
        </Link>
      ))}
    </div>
  );
  
  return (
    <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="w-full max-w-full px-2">
        <div className="flex items-center justify-between h-12">
          
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 mr-4">
            <Link href="/home">
              <span className="flex flex-col items-center cursor-pointer">
                <span className="text-lg font-bold text-primary leading-tight">HRSN + BH</span>
                <span className="text-sm font-medium text-primary leading-tight">Analytics</span>
              </span>
            </Link>
          </div>
          
          {/* Left Side: Visualization Tools (grouped together) */}
          <div className="flex items-center">
            <div className="bg-blue-50 px-2 py-1 rounded-md border border-blue-200 mr-4">
              <span className="text-xs text-blue-700 font-medium mr-2">Visualization Tools:</span>
              <NavGroup items={visualizationTools} />
            </div>
          </div>
          
          {/* Center: Main Functions */}
          <div className="flex items-center flex-1 justify-center">
            <NavGroup items={mainFunctions} className="space-x-2" />
          </div>
          
          {/* Right Side: Admin Functions + Auth (exactly where they are now) */}
          <div className="flex items-center space-x-2">
            <NavGroup items={adminFunctions} />
            
            {/* Divider */}
            <div className="h-6 w-px bg-gray-300 mx-2" />
            
            {/* Auth buttons - locked in position */}
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