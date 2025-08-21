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
  
  const NavLink = ({ 
    href, 
    icon: Icon, 
    children 
  }: { 
    href: string; 
    icon: React.ElementType; 
    children: React.ReactNode 
  }) => {
    const isActive = location === href;
    
    return (
      <Link href={href}>
        <a
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
            isActive ? "bg-muted font-medium text-primary" : "text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{children}</span>
        </a>
      </Link>
    );
  };
  
  return (
    <div className="group flex flex-col gap-1">
      <nav className="grid gap-1 px-2">
        <NavLink href="/home" icon={LayoutDashboard}>
          Dashboard
        </NavLink>
        <NavLink href="/upload" icon={Upload}>
          Upload Data
        </NavLink>
        <NavLink href="/search" icon={Search}>
          Search Records
        </NavLink>
        <NavLink href="/visualization-dashboard/1" icon={BarChart}>
          Visualizations
        </NavLink>
        <NavLink href="/payment" icon={CreditCard}>
          Payments
        </NavLink>
        <NavLink href="/receipts" icon={Receipt}>
          Receipts
        </NavLink>
        
        {user?.isAdmin && (
          <NavLink href="/admin" icon={Settings}>
            Admin Panel
          </NavLink>
        )}
        
        {user ? (
          <a
            href="#"
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-destructive",
              "text-muted-foreground"
            )}
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </a>
        ) : (
          <NavLink href="/auth" icon={LogIn}>
            Log In
          </NavLink>
        )}
      </nav>
    </div>
  );
}