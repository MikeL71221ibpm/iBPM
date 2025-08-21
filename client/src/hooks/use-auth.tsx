import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
};

type LoginData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/user");
        if (res.status === 401) {
          return null;
        }
        return await res.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    // Disable automatic refetching that could cause session issues
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    staleTime: 30 * 60 * 1000, // Consider data fresh for 30 minutes
    retry: 1 // Only retry once to avoid flooding with failed auth requests
  });

  // Store user ID in sessionStorage for WebSocket identification
  useEffect(() => {
    if (user?.id) {
      // Save user ID to session storage for WebSocket connections
      sessionStorage.setItem('userId', user.id.toString());
      sessionStorage.setItem('username', user.username);
      sessionStorage.setItem('authTime', Date.now().toString());
      console.log('User ID stored in session storage for WebSocket identification:', user.id);
    } else {
      // Only clear if explicitly logged out (not on temporary network issues)
      const authTime = sessionStorage.getItem('authTime');
      const timeSinceAuth = authTime ? Date.now() - parseInt(authTime) : Infinity;
      
      // Only clear if more than 5 minutes since auth (to handle temporary disconnects)
      if (timeSinceAuth > 5 * 60 * 1000) {
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('authTime');
      }
    }
  }, [user]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login with:", credentials.username);
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      console.log("Login successful:", user);
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      console.log("Attempting registration with:", (credentials as any).username);
      const res = await apiRequest("POST", "/api/register", credentials);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      console.log("Registration successful:", user);
      queryClient.setQueryData(["/api/user"], user);
      // Force refetch of user data to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Attempting logout");
      
      // First, close any WebSocket connections to prevent reconnection attempts
      const closeWebSockets = () => {
        // Try to find and close all WebSocket connections
        try {
          // For browsers that support this API
          if (typeof performance !== 'undefined' && performance.getEntriesByType) {
            const resources = performance.getEntriesByType("resource");
            console.log("Checking for active resources:", resources.length);
          }
          
          // Close any WebSocket connection we can find in window
          Object.keys(window).forEach(key => {
            try {
              const item = (window as any)[key];
              if (item && item.constructor && item.constructor.name === 'WebSocket') {
                console.log("Found WebSocket object in window, closing");
                item.close();
              }
            } catch (e) {
              // Ignore errors during WebSocket enumeration
            }
          });
        } catch (e) {
          console.error("Error closing WebSockets:", e);
        }
      };
      
      // Close WebSockets before logout
      closeWebSockets();
      
      // Then perform the normal logout
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        // Even if response isn't ok, we'll proceed with client-side logout
        console.warn("Server logout returned error, but proceeding with client-side logout");
      }
      
      // Return success regardless, we'll force logout on client side
      return;
    },
    onSuccess: () => {
      console.log("Logout successful");
      // Clear all React Query cache
      queryClient.clear();
      // Set user to null
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Logout successful",
        description: "You have been logged out.",
      });
      
      // Short delay before redirect to allow toast to be seen
      setTimeout(() => {
        // Use window.location.replace instead of href for a cleaner logout
        console.log("Redirecting to home page after logout");
        window.location.replace('/');
      }, 500);
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      
      // Still clear the user data to ensure client-side logout happens
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      
      toast({
        title: "Logout process",
        description: "You have been logged out, but there was a server communication issue.",
      });
      
      // Redirect to home page even after failed logout
      setTimeout(() => {
        console.log("Redirecting to home page after logout error");
        window.location.replace('/');
      }, 500);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}