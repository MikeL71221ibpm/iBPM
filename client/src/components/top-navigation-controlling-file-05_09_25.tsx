import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  Search, 
  Upload, 
  BarChart2, 
  CreditCard, 
  Settings, 
  LogOut, 
  User, 
  Menu, 
  X 
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

// Last updated: May 9, 2025 - 7:27 PM
// Horizontal navigation bar component

const TopNavigation = () => {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('/assets/logo.png');

  // Handle nav item click for mobile menu
  const handleMobileNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  // Navigation links based on auth status
  const navLinks = [
    { label: 'Home', href: '/home', icon: <Home className="h-5 w-5" /> },
    { label: 'Search', href: '/search', icon: <Search className="h-5 w-5" /> },
    { label: 'Upload', href: '/upload', icon: <Upload className="h-5 w-5" /> },
    { label: 'Visualize', href: '/nivo-scatter-view-themed/1', icon: <BarChart2 className="h-5 w-5" /> },
    { label: 'Heatmap', href: '/heatmap-view/1', icon: <BarChart2 className="h-5 w-5" /> },
    { label: 'Grid View', href: '/direct-grid-view/1', icon: <BarChart2 className="h-5 w-5" /> },
    { label: 'Payments', href: '/payment', icon: <CreditCard className="h-5 w-5" /> },
  ];

  // Set active styles based on current location
  const isActive = (href: string) => {
    if (href === '/home' && location === '/') return true;
    return location.startsWith(href);
  };

  // Logo fallback handling
  useEffect(() => {
    const logo = new Image();
    logo.onload = () => {
      // Logo loaded successfully, use it
      setLogoUrl('/assets/logo.png');
    };
    logo.onerror = () => {
      // Logo failed to load, use text fallback
      console.log('Logo image failed to load, using text fallback');
      setLogoUrl('');
    };
    logo.src = '/assets/logo.png';
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and site name */}
        <div className="flex items-center">
          <Link href="/home">
            <div className="flex items-center space-x-2 cursor-pointer">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 w-auto" onError={() => setLogoUrl('')} />
              ) : (
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary text-white font-bold">
                  BH
                </div>
              )}
              <span className="font-bold text-lg hidden md:inline-block">Behavioral Health AI</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1 mx-6 ml-24">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant={isActive(link.href) ? "default" : "ghost"}
                className={`flex items-center text-sm px-3 py-1 ${
                  isActive(link.href) ? "bg-primary text-white" : ""
                }`}
                size="sm"
              >
                {link.icon}
                <span className="ml-2">{link.label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        {/* User menu (desktop) */}
        <div className="hidden md:flex items-center space-x-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center justify-start p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.username}</p>
                    {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/receipts">
                    <div className="w-full cursor-pointer flex items-center">
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Billing</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <div className="w-full cursor-pointer flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/logout">
                    <div className="w-full cursor-pointer flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/auth">Sign in</Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="px-2 py-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
                    ) : (
                      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary text-white font-bold">
                        BH
                      </div>
                    )}
                    <span className="font-bold text-lg">Behavioral Health AI</span>
                  </div>
                  <SheetClose className="rounded-full">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </SheetClose>
                </div>
                <nav className="flex flex-col space-y-3">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link href={link.href}>
                        <Button
                          variant={isActive(link.href) ? "default" : "ghost"}
                          className={`w-full justify-start text-base ${
                            isActive(link.href) ? "bg-primary text-white" : ""
                          }`}
                          onClick={handleMobileNavClick}
                        >
                          {link.icon}
                          <span className="ml-2">{link.label}</span>
                        </Button>
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                {user ? (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center mb-4">
                      <User className="h-5 w-5 mr-2" />
                      <div>
                        <p className="font-medium">{user.username}</p>
                        {user.email && (
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <SheetClose asChild>
                        <Link href="/receipts">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={handleMobileNavClick}
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Billing
                          </Button>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/settings">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={handleMobileNavClick}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </Button>
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/logout">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={handleMobileNavClick}
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                          </Button>
                        </Link>
                      </SheetClose>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 pt-6 border-t">
                    <SheetClose asChild>
                      <Link href="/auth">
                        <Button className="w-full" onClick={handleMobileNavClick}>
                          Sign in
                        </Button>
                      </Link>
                    </SheetClose>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default TopNavigation;