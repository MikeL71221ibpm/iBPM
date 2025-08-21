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
  LogIn
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

// Last updated: May 9, 2025 - 5:50 AM
// Controls component: MainNav - used across the application for navigation

export default function MainNav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
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
      title: "Upload Data",
      href: "/upload",
      icon: <Upload className="w-3.5 h-3.5" />
    },
    {
      title: "Pivot Tables",
      href: "/simplified-auto-pivot/1",
      icon: <BarChart className="w-3.5 h-3.5" />
    },
    {
      title: "Heatmaps",
      href: "/enhanced-heatmap-v2/1",
      icon: <PieChart className="w-3.5 h-3.5" />
    },
    {
      title: "Bubble Charts",
      href: "/nivo-scatter-view-themed/1", 
      icon: <LineChart className="w-3.5 h-3.5" />
    },
    {
      title: "Billing",
      href: "/receipts",
      icon: <CreditCard className="w-3.5 h-3.5" />
    }
  ];
  
  // Add Admin link only for admin users
  if (isAdmin) {
    navItems.push({
      title: "Admin",
      href: "/admin",
      icon: <Settings className="w-3.5 h-3.5" />
    });
  }
  
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 px-3 py-4 bg-white border-r">
        <div className="px-3 py-2">
          <h2 className="text-lg font-semibold">Behavioral Health AI</h2>
          <p className="text-xs text-muted-foreground">Analytics Dashboard</p>
        </div>
        
        <div className="mt-6 flex flex-col flex-1">
          <nav className="flex-1">
            <ul className="space-y-1.5 px-3">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link 
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      location === item.href 
                        ? "bg-primary text-white" 
                        : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    {item.icon}
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="mt-auto px-3 py-2">
            {user ? (
              <>
                <div className="mb-2 px-4 py-2 rounded-md">
                  <p className="font-medium text-sm">{user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? "Administrator" : "User"}
                  </p>
                </div>
                <Link 
                  href="/logout"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </Link>
              </>
            ) : (
              <Link 
                href="/auth"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-white border-b z-30 flex items-center px-4">
        <h2 className="text-lg font-semibold">Behavioral Health AI</h2>
      </div>
      
      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t z-30 flex items-center justify-around px-4">
        {navItems.slice(0, 5).map((item) => (
          <Link 
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full",
              location === item.href 
                ? "text-primary" 
                : "text-muted-foreground"
            )}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.title}</span>
          </Link>
        ))}
        
        {/* More menu item for mobile (simplified) */}
        <Link 
          href="/receipts"
          className={cn(
            "flex flex-col items-center justify-center w-16 h-full",
            location === "/receipts" 
              ? "text-primary" 
              : "text-muted-foreground"
          )}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span className="text-xs mt-1">Billing</span>
        </Link>
      </div>
    </div>
  );
}