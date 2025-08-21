import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle } from "lucide-react";

export default function DirectLoginPage() {
  const { user, loginMutation } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // If user is already logged in, redirect to home page
  if (user) {
    return <Redirect to="/home" />;
  }

  const handleAdminLogin = async () => {
    setIsLoggingIn(true);
    loginMutation.mutate(
      { username: "admin", password: "admin123" },
      {
        onSuccess: () => {
          // Redirect will happen automatically when user state changes
          setIsLoggingIn(false);
        },
        onError: (error) => {
          console.error("Login error:", error);
          setIsLoggingIn(false);
          alert("Login failed: " + error.message);
        }
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Direct Admin Login
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <p className="text-center text-muted-foreground">
            This page provides a direct login for administrators to bypass the regular login form.
          </p>
          <Button
            onClick={handleAdminLogin}
            className="w-full"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Logging in as Admin...
              </>
            ) : (
              "Login as Admin"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}