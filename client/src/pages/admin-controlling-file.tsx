import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Building2, Shield, Users, FileText, Activity, Settings, ArrowLeft, LogOut, Mail, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminPreProcessing from "@/components/AdminPreProcessing";
import ProcessLogsReporting from "@/components/admin/ProcessLogsReporting";

// Last updated: August 2, 2025 22:17 - Delete button fix v3
// Controls route: /admin
// Version: 3.0 - Fixed delete button visibility with proper text

interface User {
  id: number;
  username: string;
  email: string;
  company?: string;
  isAdmin?: boolean;
  createdAt?: string;
  patientCount?: number;
  noteCount?: number;
  symptomCount?: number;
}

function UserManagementSection() {
  const [activeTab, setActiveTab] = useState("users");
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    password: '',
    company: '',
    isAdmin: false
  });
  const [newCompanyName, setNewCompanyName] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);
  const [showCreateUserPassword, setShowCreateUserPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: true
  });

  // Fetch all companies
  const { data: companies = [], isLoading: companiesLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/companies'],
    enabled: true
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: { username: string; email: string; password: string; company: string; isAdmin: boolean }) => 
      apiRequest('POST', '/api/admin/create-user', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsCreateUserOpen(false);
      setNewUserData({ username: '', email: '', password: '', company: '', isAdmin: false });
      toast({ title: "User created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
    }
  });

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: (companyData: string) => 
      apiRequest('POST', '/api/admin/create-company', { name: companyData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/companies'] });
      setIsCreateCompanyOpen(false);
      setNewCompanyName('');
      toast({ title: "Company created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create company", description: error.message, variant: "destructive" });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => 
      apiRequest('DELETE', `/api/admin/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    }
  });

  // Toggle admin mutation
  const toggleAdminMutation = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: any; isAdmin: boolean }) => 
      apiRequest('POST', '/api/admin/toggle-admin', { userId, isAdmin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Admin privileges updated" });
    },
    onError: (error) => {
      toast({ title: "Failed to update admin privileges", description: error.message, variant: "destructive" });
    }
  });

  const handleCreateUser = () => {
    if (!newUserData.username || !newUserData.email || !newUserData.password) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createUserMutation.mutate(newUserData);
  };

  const handleCreateCompany = () => {
    if (!newCompanyName.trim()) {
      toast({ title: "Please enter a company name", variant: "destructive" });
      return;
    }
    createCompanyMutation.mutate(newCompanyName);
  };

  const handleDeleteUser = (userId, username) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleToggleAdmin = (userId, currentAdminStatus) => {
    toggleAdminMutation.mutate({ userId, isAdmin: !currentAdminStatus });
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="companies">Companies</TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">User Management</h3>
          <div className="flex gap-2">
            <Button
              variant={showDeletedUsers ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowDeletedUsers(!showDeletedUsers)}
            >
              {showDeletedUsers ? "Hide" : "Show"} Deleted Users
            </Button>
            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user account with email-based authentication
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showCreateUserPassword ? "text" : "password"}
                      value={newUserData.password}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCreateUserPassword(!showCreateUserPassword)}
                    >
                      {showCreateUserPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">
                        {showCreateUserPassword ? "Hide password" : "Show password"}
                      </span>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company (Optional)</Label>
                  <Select value={newUserData.company} onValueChange={(value) => setNewUserData(prev => ({ ...prev, company: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Company</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.name} value={company.name}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="admin"
                    checked={newUserData.isAdmin}
                    onCheckedChange={(checked) => setNewUserData(prev => ({ ...prev, isAdmin: checked }))}
                  />
                  <Label htmlFor="admin">Admin Privileges</Label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {usersLoading ? (
          <div className="text-center py-4">Loading users...</div>
        ) : (
          <div className="space-y-3">
            {users
              .filter(user => {
                const isDeleted = user.username.includes('_deleted_') || user.email.includes('deleted_');
                return showDeletedUsers ? isDeleted : !isDeleted;
              })
              .map((user) => (
              <Card key={user.id} className="overflow-visible" style={{ 
                border: user.username.includes('_deleted_') || user.email.includes('deleted_') ? '2px solid red' : '2px solid green',
                opacity: user.username.includes('_deleted_') || user.email.includes('deleted_') ? 0.7 : 1
              }}>
                <CardContent className="p-4">
                  <div className="flex justify-between gap-4 items-start">
                    <div className="flex-1 min-w-0" style={{ maxWidth: 'calc(100% - 200px)' }}>
                      <h4 className="font-medium text-sm" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }} title={user.username}>
                        {user.username}
                        {(user.username.includes('_deleted_') || user.email.includes('deleted_')) && 
                          <Badge variant="destructive" className="ml-2 text-xs">DELETED</Badge>
                        }
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {user.isAdmin && <Badge variant="secondary" className="text-xs"><Shield className="h-3 w-3 mr-1" />Admin</Badge>}
                        {user.email === 'MikeL71221@gmail.com' && <Badge variant="default" className="text-xs">Master Admin</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="break-all">{user.email}</span>
                        </div>
                        {user.company && (
                          <div className="flex items-center gap-1 mt-1">
                            <Building2 className="h-3 w-3" />
                            <span>{user.company}</span>
                          </div>
                        )}
                        <div className="text-xs mt-1">
                          User ID: {user.id} • Created: {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                        </div>
                        {/* Data Statistics */}
                        <div className="text-xs mt-2 space-y-1">
                          <div className={`flex items-center gap-2 ${(user.patientCount > 0 || user.noteCount > 0 || user.symptomCount > 0) ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                            <span>📊 Data:</span>
                            <span>{user.patientCount || 0} patients</span>
                            <span>•</span>
                            <span>{user.noteCount || 0} notes</span>
                            <span>•</span>
                            <span>{user.symptomCount || 0} symptoms</span>
                          </div>
                          {(user.patientCount > 0 || user.noteCount > 0 || user.symptomCount > 0) && (
                            <div className="text-orange-600 font-semibold">
                              ⚠️ Has data - deletion will preserve records
                            </div>
                          )}
                        </div>
                        {(user.username.includes('_deleted_') || user.email.includes('deleted_')) && (
                          <div className="text-xs mt-2 text-red-600">
                            <strong>Account Status:</strong> DELETED - Cannot login
                            <br />
                            <strong>Data Preserved:</strong> All patient data remains in system
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                        disabled={user.id === 4 || user.email === 'MikeL71221@gmail.com'}
                        title={user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                      >
                        <Shield className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        disabled={user.id === 4 || user.email === 'MikeL71221@gmail.com'}
                        title="Delete User"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="companies" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Company Management</h3>
          <Dialog open={isCreateCompanyOpen} onOpenChange={setIsCreateCompanyOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
                <DialogDescription>
                  Add a new company for user organization and data isolation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateCompany} disabled={createCompanyMutation.isPending}>
                  {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {companiesLoading ? (
          <div className="text-center py-4">Loading companies...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((company) => (
              <Card key={company.name}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {company.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {company.userCount || 0} users • Created: {new Date(company.createdAt || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Switch to Users tab
                        setActiveTab("users");
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Users
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

export default function AdminPage() {
  console.log("Admin controlling file loaded with user management interface - VERSION 5 WITH DELETE BUTTON FIX");
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  
  // Add global CSS fix for table overflow issues
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Global fix for admin page tables with long usernames */
      #multi-user-account-management table {
        table-layout: fixed !important;
        width: 100% !important;
      }
      
      #multi-user-account-management td {
        padding: 8px !important;
      }
      
      #multi-user-account-management td:first-child {
        max-width: 250px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      
      #multi-user-account-management td:last-child {
        width: 100px !important;
        text-align: right !important;
      }
      
      /* Force delete buttons to be visible */
      #multi-user-account-management button,
      #multi-user-account-management .delete-btn,
      #multi-user-account-management input[type="button"],
      #multi-user-account-management input[type="submit"] {
        visibility: visible !important;
        display: inline-block !important;
        min-width: 60px !important;
        background-color: #10b981 !important;
        color: white !important;
        padding: 4px 12px !important;
        border-radius: 4px !important;
        border: none !important;
        cursor: pointer !important;
      }
      
      #multi-user-account-management button:hover,
      #multi-user-account-management .delete-btn:hover {
        background-color: #059669 !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  
  // Check if user has admin privileges - User ID 4 (legacy), isAdmin field, or MikeL71221@gmail.com email
  const isAdmin = user?.id === 4 || user?.isAdmin === true || user?.email === 'MikeL71221@gmail.com';
  
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/auth";
  };
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <Button onClick={() => setLocation("/auth")}>Go to Login</Button>
        </div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Admin Access Required</h1>
          <p className="mb-4">
            This page is only accessible to administrators. 
            Your user ID ({user.id}) does not have admin privileges.
          </p>
          <Button onClick={() => setLocation("/")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/home">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage system settings and data processing
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="text-sm text-right mr-2">
              <div className="font-medium">{user.username}</div>
              <div className="text-muted-foreground">Administrator</div>
            </div>
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-medium flex items-center">
                <Settings className="h-5 w-5 mr-2 text-primary" />
                Admin Tools
              </h2>
              <div className="mt-4 space-y-2">
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <a href="#preprocessing">Pre-processing</a>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <a href="#user-management">User Management</a>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <a href="#multi-user-account-management">Multi-User Account Management</a>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <a href="#system-logs">System Logs</a>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <a href="#process-reporting">Performance Reports</a>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <a href="#data-management">Data Management</a>
                </Button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-medium">System Status</h2>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Database</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Online
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Data Processing</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Operational
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Stripe Payments</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Connected
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            <div id="preprocessing" className="bg-white rounded-lg shadow overflow-hidden">
              <div className="border-b p-4">
                <h2 className="text-xl font-medium">Pre-processing Management</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure how clinical data is processed and analyzed
                </p>
              </div>
              
              <div className="p-4">
                <AdminPreProcessing />
              </div>
            </div>
            
            <div id="user-management" className="bg-white rounded-lg shadow overflow-hidden">
              <div className="border-b p-4">
                <h2 className="text-xl font-medium flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  User Management
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage user accounts and permissions
                </p>
              </div>
              
              <div className="p-4">
                <UserManagementSection />
              </div>
            </div>
            
            <div id="multi-user-account-management" className="bg-white rounded-lg shadow overflow-hidden">
              <div className="border-b p-4">
                <h2 className="text-xl font-medium flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary" />
                  Multi-User Account Management
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enterprise file management system for healthcare organizations
                </p>
              </div>
              
              <div className="p-4">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Healthcare Organization Features</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Multi-file management (up to 3 simultaneous files per user)</li>
                      <li>• Organization-level file sharing and permissions</li>
                      <li>• Role-based access control (Admin, Analyst, Viewer)</li>
                      <li>• Consolidated billing for organization usage</li>
                      <li>• EHR integration tracking and data source management</li>
                    </ul>
                  </div>
                  
                  <div className="flex gap-4">
                    <Link href="/multi-user-account-management">
                      <Button className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Launch Multi-User System
                      </Button>
                    </Link>
                    
                    <Button variant="outline" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      View Documentation
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="font-medium text-sm">File Management</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Upload, organize, and analyze multiple healthcare datasets simultaneously
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="font-medium text-sm">Team Collaboration</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Share files across organization with permission controls
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="font-medium text-sm">Organization Billing</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Consolidated invoicing and usage tracking for enterprise accounts
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div id="system-logs" className="bg-white rounded-lg shadow overflow-hidden">
              <div className="border-b p-4">
                <h2 className="text-xl font-medium">System Logs</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  View system activity and error logs
                </p>
              </div>
              
              <div className="p-4">
                <p className="text-muted-foreground">
                  System logs viewer is under development.
                </p>
              </div>
            </div>
            
            <div id="process-reporting" className="bg-white rounded-lg shadow overflow-hidden">
              <div className="border-b p-4">
                <h2 className="text-xl font-medium flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-primary" />
                  System Performance Reports
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Comprehensive analysis of upload and processing activities
                </p>
              </div>
              
              <div className="p-4">
                <p className="text-muted-foreground">
                  Performance reporting dashboard is under development.
                </p>
              </div>
            </div>

            <div id="data-management" className="bg-white rounded-lg shadow overflow-hidden">
              <div className="border-b p-4">
                <h2 className="text-xl font-medium">Data Management</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage and clean data stored in the system
                </p>
              </div>
              
              <div className="p-4">
                <p className="text-muted-foreground">
                  Data management tools are under development.
                </p>
              </div>
            </div>

            {/* Emergency Recovery Options */}
            <div className="bg-red-50 border border-red-200 rounded-lg shadow overflow-hidden">
              <div className="border-b border-red-200 p-4">
                <h2 className="text-xl font-medium text-red-800">Emergency Recovery Options</h2>
                <p className="text-sm text-red-600 mt-1">
                  Direct access to emergency recovery tools
                </p>
              </div>
              
              <div className="p-4">
                <p className="text-red-700 mb-4">
                  If the system becomes unresponsive or you need direct access to recovery tools:
                </p>
                <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" asChild>
                  <a href="/emergency-test.html" target="_blank" rel="noopener noreferrer">
                    Access Emergency Recovery Page
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}