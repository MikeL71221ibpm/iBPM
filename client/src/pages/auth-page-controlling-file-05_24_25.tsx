import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoaderCircle, Eye, EyeOff } from "lucide-react";

// Last updated: May 24, 2025 - 11:55 PM
// Controls route: /auth

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  confirmEmail: z.string().email("Please enter a valid email"),
  company: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.email === data.confirmEmail, {
  message: "Email addresses must match",
  path: ["confirmEmail"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Auto-switch to register tab if accessing /register route
  useEffect(() => {
    if (location === "/register") {
      setActiveTab("register");
    }
  }, [location]);
  
  // Set initialization complete after component mounts
  useEffect(() => {
    // Immediate initialization - no delay
    setIsInitializing(false);
  }, []);
  
  // Don't auto-logout on page visit; only if user clicks logout button
  // This was causing a logout loop

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      confirmEmail: "",
      company: "",
      password: "",
    },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    // Show loading spinner immediately when form is submitted
    setIsRedirecting(true);
    
    // Ensure data has required properties
    const loginData = {
      username: data.username,
      password: data.password
    };
    
    loginMutation.mutate(loginData, {
      onSuccess: () => {
        // Immediate redirect - no delay needed
        window.location.href = '/home';
      },
      onError: () => {
        // Hide spinner if login fails
        setIsRedirecting(false);
      }
    });
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    // Show loading spinner immediately when form is submitted
    setIsRedirecting(true);
    
    registerMutation.mutate(data, {
      onSuccess: () => {
        // Immediate redirect - no delay needed
        window.location.href = '/home';
      },
      onError: () => {
        // Hide spinner if registration fails
        setIsRedirecting(false);
      }
    });
  };

  // If user is already logged in, redirect to home page
  if (user) {
    return <Redirect to="/home" />;
  }
  
  // Show initial loading spinner while app initializes
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Initializing Application</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  // Show loading spinner during redirect
  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {activeTab === "login" ? "Welcome Back!" : "Welcome to iBPM!"}
          </h2>
          <p className="text-gray-600 mb-2">
            {activeTab === "login" 
              ? "Preparing your personalized dashboard..." 
              : "Setting up your new account..."
            }
          </p>
          <p className="text-sm text-gray-500">
            {activeTab === "login"
              ? "Loading your patient data and analytics"
              : "Creating your workspace and initializing analytics"
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Direct access button for visualization */}
      <div className="w-full p-4 bg-slate-50 border-b flex justify-end">
        <Button 
          variant="outline" 
          onClick={() => window.location.href = '/nivo-scatter-view-themed/1'}
          className="bg-primary/10 text-primary hover:bg-primary/20"
        >
          Direct Access to Themed Visualizations →
        </Button>
      </div>
      
      <div className="flex flex-1">
        {/* Form Column */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                Behavioral Health AI Solutions
              </CardTitle>
              <CardDescription className="text-center">
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as "login" | "register")}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-4">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your username" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showLoginPassword ? "text" : "password"} 
                                  {...field} 
                                  placeholder="••••••" 
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                                >
                                  {showLoginPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="sr-only">
                                    {showLoginPassword ? "Hide password" : "Show password"}
                                  </span>
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            Logging in...
                          </>
                        ) : (
                          "Login"
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register" className="mt-4">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Choose a username" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Email</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Re-enter your email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your company name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showRegisterPassword ? "text" : "password"} 
                                  {...field} 
                                  placeholder="••••••" 
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                >
                                  {showRegisterPassword ? (
                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="sr-only">
                                    {showRegisterPassword ? "Hide password" : "Show password"}
                                  </span>
                                </Button>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Must be at least 6 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-center text-sm text-muted-foreground">
              {activeTab === "login" ? (
                <span>Don't have an account? <Button variant="link" className="p-0" onClick={() => setActiveTab("register")}>Register</Button></span>
              ) : (
                <span>Already have an account? <Button variant="link" className="p-0" onClick={() => setActiveTab("login")}>Login</Button></span>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Hero Column */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-r from-blue-500 to-purple-600 flex-col justify-center items-center p-8 text-white">
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold mb-4">Behavioral Health AI Solutions</h1>
            <p className="text-xl mb-6">
              Powerful AI tools to analyze patient notes and identify behavioral health needs.
            </p>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-white bg-opacity-20 p-2 rounded-full mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Symptom Detection</h3>
                  <p>Automatically detect symptoms from clinical notes</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-white bg-opacity-20 p-2 rounded-full mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Visualized Analytics</h3>
                  <p>Interactive dashboards and visual reports</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-white bg-opacity-20 p-2 rounded-full mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Secure & Compliant</h3>
                  <p>Built with healthcare security standards in mind</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}