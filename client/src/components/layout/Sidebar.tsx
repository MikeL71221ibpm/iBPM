import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Home, 
  Search, 
  Users, 
  LineChart, 
  Settings, 
  Download
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";

const Sidebar = () => {
  const [location] = useLocation();
  const { downloadCurrentData } = useAppContext();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <Home className="w-5 h-5 mr-3" /> },
    { path: "/patient-search", label: "Patient Search", icon: <Search className="w-5 h-5 mr-3" /> },
    { path: "/population-health", label: "Population Health", icon: <Users className="w-5 h-5 mr-3" /> },
    { path: "/analytics", label: "Analytics", icon: <LineChart className="w-5 h-5 mr-3" /> },
    { path: "/settings", label: "Settings", icon: <Settings className="w-5 h-5 mr-3" /> },
  ];

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="w-64 bg-primary-600 text-white h-full flex flex-col shadow-lg">
      <div className="p-4 flex items-center border-b border-primary-500">
        <Brain className="w-6 h-6 mr-3" />
        <h1 className="text-lg font-semibold">Behavioral Health AI</h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <a className={`flex items-center px-6 py-3 ${
                  isActive(item.path) 
                    ? "text-primary-100 bg-primary-700" 
                    : "hover:bg-primary-700 transition-colors"
                }`}>
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-primary-500">
        <Button 
          variant="secondary" 
          className="w-full bg-secondary-500 hover:bg-secondary-600 text-white"
          onClick={downloadCurrentData}
        >
          <Download className="w-4 h-4 mr-2" /> Download Snapshot
        </Button>
        
        <div className="mt-4 flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary-400 flex items-center justify-center text-white font-semibold">
            JD
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">John Doe</p>
            <p className="text-xs text-primary-200">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
