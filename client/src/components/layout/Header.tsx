import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Crown, Bell, HelpCircle, LogOut, User, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

const Header = () => {
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Behavioral Health AI Solutions
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center mr-2">
                <User className="w-4 h-4 mr-1 text-gray-600" />
                <span className="text-sm text-gray-600">
                  {user.username}
                </span>
              </div>
            )}
            
            {user && (
              <>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  PRO Account
                </Badge>
                
                <Link href="/subscription">
                  <a className="text-sm text-primary-600 hover:text-primary-800 flex items-center">
                    <Crown className="w-4 h-4 mr-1" /> Manage Subscription
                  </a>
                </Link>
                
                <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-full">
                  <Bell className="w-5 h-5" />
                </Button>
              </>
            )}
            
            <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-full">
              <HelpCircle className="w-5 h-5" />
            </Button>
            
            {user ? (
              <Button 
                variant="outline"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            ) : (
              <Link href="/auth">
                <Button 
                  variant="outline"
                  className="flex items-center gap-1 text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                >
                  <LogIn className="w-4 h-4" /> Login/Register
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
