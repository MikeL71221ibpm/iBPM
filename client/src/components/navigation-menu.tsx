// Navigation Menu Component for accessing different pages/features
import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { ChevronRight, LayoutGrid, BarChart, ChartPie, ListFilter, Settings } from 'lucide-react';

export default function NavigationMenu() {
  const [location] = useLocation();
  
  // Navigation items with paths and labels
  const navItems = [
    { path: '/', label: 'Home', icon: <LayoutGrid className="w-4 h-4 mr-2" /> },
    { path: '/population-health-charts-05_23_25', label: 'Population Health Charts', icon: <BarChart className="w-4 h-4 mr-2" /> },
    { path: '/fixed-charts-05_22_25', label: 'Fixed Charts', icon: <ChartPie className="w-4 h-4 mr-2" /> },
    { path: '/category-selector-demo', label: 'Category Selector', icon: <ListFilter className="w-4 h-4 mr-2" /> },
    { path: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4 mr-2" /> }
  ];
  
  return (
    <div className="bg-card shadow-sm border-b">
      <div className="container mx-auto px-4 py-2">
        <nav className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <a className="flex items-center mr-6">
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  HRSN + BH Analytics
                </h1>
              </a>
            </Link>
            
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <a className={`px-3 py-2 rounded-md text-sm ${
                    location === item.path 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}>
                    <span className="flex items-center">
                      {item.icon}
                      {item.label}
                    </span>
                  </a>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link href="/api/logout">
              <Button variant="outline" size="sm">Log Out</Button>
            </Link>
          </div>
        </nav>
        
        {/* Breadcrumb for current page */}
        <div className="flex items-center text-xs text-muted-foreground py-1">
          <Link href="/">
            <a className="hover:text-foreground">Home</a>
          </Link>
          
          {location !== '/' && (
            <>
              <ChevronRight className="w-3 h-3 mx-1" />
              <span className="font-medium text-foreground">
                {navItems.find(item => item.path === location)?.label || 'Page'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}