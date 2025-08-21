import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoaderCircle } from "lucide-react";

// Last updated: May 9, 2025 - 5:45 AM
// Controls route: /auth

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  
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
      company: "",
      password: "",
    },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        // Use Redirect component to navigate to home page (this will happen automatically
        // because the user data will change, triggering the redirect above)
        // No need to manually set window.location
      }
    });
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        // Use Redirect component to navigate to home page (this will happen automatically
        // because the user data will change, triggering the redirect above)
        // No need to manually set window.location
      }
    });
  };

  // We're temporarily disabling the auto-redirect to examine the login page
  // Comment: Original code redirected logged in users to home page
  // if (user) {
  //   return <Redirect to="/home" />;
  // }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header area - clean design with no buttons */}
      <div className="w-full p-4 bg-slate-50 border-b"></div>
      
      {/* Content container with constrained width */}
      <div className="w-full mx-auto max-w-[95%] sm:max-w-[90%] md:max-w-[85%] lg:max-w-[80%] xl:max-w-[75%]">
        <div className="flex flex-1">
          {/* Form Column */}
          <div className="w-full md:w-1/2 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-center text-blue-700">
                  <span className="italic">i</span>BPM
                </CardTitle>
                <CardDescription className="text-center text-lg font-medium">
                  Behavioral Health AI Solutions
                </CardDescription>
                <CardDescription className="text-center mt-1">
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
                                <Input type="password" {...field} placeholder="••••••" />
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
                                <Input type="password" {...field} placeholder="••••••" />
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
              <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">iBPM</h1>
              <h2 className="text-2xl font-medium mb-2 text-white/90">Behavioral Health AI Solutions</h2>
              <p className="text-xl mb-8 leading-relaxed">
                Powerful AI tools to analyze patient notes and identify HRSN and behavioral health needs.
              </p>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-white bg-opacity-20 p-2 rounded-full mr-4 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl">Problem/Symptom Detection</h3>
                    <p className="text-white/80 leading-relaxed">Automatically detect problems and symptoms from clinical notes</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-white bg-opacity-20 p-2 rounded-full mr-4 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl">Visualized Analytics</h3>
                    <p className="text-white/80 leading-relaxed">Interactive dashboards and visual reports</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-white bg-opacity-20 p-2 rounded-full mr-4 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl">Secure & Compliant</h3>
                    <p className="text-white/80 leading-relaxed">Built with healthcare security standards & interoperability in mind</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}