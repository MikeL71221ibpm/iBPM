import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  FileText, 
  Building2, 
  Database,
  Settings,
  Shield,
  Activity,
  Clock,
  TrendingUp,
  CheckCircle,
  Upload,
  Share2,
  Eye,
  Edit,
  Play,
  Pause,
  UserPlus
} from "lucide-react";

// Demo data representing a healthcare organization
const demoData = {
  currentUser: {
    name: "Dr. Sarah Johnson",
    role: "Senior Analyst",
    organization: "Regional Medical Center",
    maxConcurrentFiles: 3
  },
  activeFiles: [
    {
      id: 1,
      name: "Emergency_Dept_March_2024.xlsx",
      displayName: "Emergency Department - March 2024",
      records: 1247,
      patients: 89,
      status: "active",
      uploadedBy: "Dr. Sarah Johnson",
      uploadDate: "2024-03-15",
      dataSource: "Epic EHR",
      lastAnalyzed: "2 hours ago"
    },
    {
      id: 2,
      name: "Cardiac_Unit_Q1_2024.csv",
      displayName: "Cardiac Unit - Q1 2024",
      records: 834,
      patients: 156,
      status: "active",
      uploadedBy: "Dr. Sarah Johnson",
      uploadDate: "2024-03-10",
      dataSource: "Cerner EHR",
      lastAnalyzed: "30 minutes ago"
    }
  ],
  availableFiles: [
    {
      id: 3,
      name: "Outpatient_Visits_Q1.xlsx",
      displayName: "Outpatient Visits - Q1 2024",
      records: 2156,
      patients: 445,
      status: "available",
      uploadedBy: "Dr. Sarah Johnson",
      uploadDate: "2024-02-28",
      dataSource: "Allscripts EHR",
      lastAnalyzed: "3 days ago"
    }
  ],
  organizationFiles: [
    {
      id: 4,
      name: "Shared_Research_Cohort.csv",
      displayName: "Cardiac Research Cohort (Shared)",
      records: 3421,
      patients: 287,
      status: "shared",
      uploadedBy: "Dr. Michael Chen",
      uploadDate: "2024-03-20",
      dataSource: "Epic EHR",
      sharedWith: "Research Team",
      permission: "View & Analyze"
    },
    {
      id: 5,
      name: "Dept_Metrics_2024.xlsx",
      displayName: "Department Metrics 2024 (Shared)",
      records: 892,
      patients: 134,
      status: "shared",
      uploadedBy: "Nurse Lisa Wong",
      uploadDate: "2024-03-25",
      dataSource: "Cerner EHR",
      sharedWith: "Quality Team",
      permission: "View Only"
    }
  ],
  organizationUsers: [
    { name: "Dr. Michael Chen", role: "Research Director", fileCount: 5, status: "Admin" },
    { name: "Nurse Lisa Wong", role: "Quality Analyst", fileCount: 3, status: "Analyst" },
    { name: "Dr. Sarah Johnson", role: "Senior Analyst", fileCount: 3, status: "Analyst" },
    { name: "John Davis", role: "Data Viewer", fileCount: 0, status: "Viewer" }
  ]
};

const MultiUserDemoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('file-manager');
  const [currentView, setCurrentView] = useState<'my-files' | 'shared-files'>('my-files');
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [activeFiles, setActiveFiles] = useState(demoData.activeFiles);
  const [availableFiles, setAvailableFiles] = useState(demoData.availableFiles);

  // Simulate file activation
  const activateFile = (fileId: number) => {
    if (activeFiles.length >= 3) {
      alert("Maximum of 3 files can be active at once. Please deactivate a file first.");
      return;
    }

    const fileToActivate = availableFiles.find(f => f.id === fileId) || 
                          demoData.organizationFiles.find(f => f.id === fileId);
    
    if (fileToActivate) {
      setActiveFiles([...activeFiles, { ...fileToActivate, status: 'active' }]);
      setAvailableFiles(availableFiles.filter(f => f.id !== fileId));
    }
  };

  // Simulate file deactivation
  const deactivateFile = (fileId: number) => {
    const fileToDeactivate = activeFiles.find(f => f.id === fileId);
    if (fileToDeactivate) {
      setActiveFiles(activeFiles.filter(f => f.id !== fileId));
      if (fileToDeactivate.uploadedBy === demoData.currentUser.name) {
        setAvailableFiles([...availableFiles, { ...fileToDeactivate, status: 'available' }]);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with User Context */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Multi-User File Management</h1>
              <p className="text-gray-600">
                Logged in as <strong>{demoData.currentUser.name}</strong> • {demoData.currentUser.role}
              </p>
              <p className="text-sm text-gray-500">{demoData.currentUser.organization}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-medium text-gray-700">
              Active Files: {activeFiles.length}/{demoData.currentUser.maxConcurrentFiles}
            </div>
            <div className="text-xs text-gray-500">
              Real-time file management
            </div>
          </div>
        </div>
      </div>

      {/* Quick Training Scenarios */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-800">🎓 Training Scenarios</CardTitle>
          <CardDescription>
            Click these scenarios to see how the system handles real healthcare use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button 
              variant="outline" 
              onClick={() => setSelectedScenario('heavy-user')}
              className="justify-start h-auto p-3"
            >
              <div className="text-left">
                <div className="font-medium">Heavy User Workflow</div>
                <div className="text-xs text-gray-600">Multiple files, context switching</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedScenario('team-sharing')}
              className="justify-start h-auto p-3"
            >
              <div className="text-left">
                <div className="font-medium">Team Collaboration</div>
                <div className="text-xs text-gray-600">Shared files, permissions</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedScenario('admin-control')}
              className="justify-start h-auto p-3"
            >
              <div className="text-left">
                <div className="font-medium">Admin Management</div>
                <div className="text-xs text-gray-600">User roles, access control</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Interface Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="file-manager" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            File Manager
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Admin View
          </TabsTrigger>
        </TabsList>

        {/* File Manager Tab */}
        <TabsContent value="file-manager" className="space-y-6">
          {/* View Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant={currentView === 'my-files' ? 'default' : 'outline'}
                onClick={() => setCurrentView('my-files')}
                size="sm"
              >
                My Files
              </Button>
              <Button
                variant={currentView === 'shared-files' ? 'default' : 'outline'}
                onClick={() => setCurrentView('shared-files')}
                size="sm"
              >
                Organization Files
              </Button>
            </div>
            <Button className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload New File
            </Button>
          </div>

          {/* Active Files Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Active Files ({activeFiles.length}/{demoData.currentUser.maxConcurrentFiles})
              </CardTitle>
              <CardDescription>
                Files currently loaded for analysis - you can work with these simultaneously
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No files currently active</p>
                  <p className="text-sm">Activate files below to begin multi-file analysis</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeFiles.map((file) => (
                    <Card key={file.id} className="border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium">
                            {file.displayName}
                          </CardTitle>
                          <Badge className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          Last analyzed: {file.lastAnalyzed}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Records:</span>
                            <span className="font-medium">{file.records.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Patients:</span>
                            <span className="font-medium">{file.patients.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Source:</span>
                            <span className="font-medium">{file.dataSource}</span>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex justify-between items-center">
                          <Button size="sm" variant="outline" className="text-xs">
                            <Eye className="h-3 w-3 mr-1" />
                            Analyze
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => deactivateFile(file.id)}
                          >
                            <Pause className="h-3 w-3 mr-1" />
                            Deactivate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Files Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                {currentView === 'my-files' ? 'My Available Files' : 'Organization Shared Files'}
              </CardTitle>
              <CardDescription>
                {currentView === 'my-files' 
                  ? 'Your uploaded files ready for activation'
                  : 'Files shared by your organization members'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(currentView === 'my-files' ? availableFiles : demoData.organizationFiles).map((file) => (
                  <Card key={file.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-medium">
                          {file.displayName}
                        </CardTitle>
                        <div className="flex items-center gap-1">
                          {file.status === 'shared' && <Share2 className="h-4 w-4 text-blue-500" />}
                          <Badge variant="outline">
                            {file.status === 'shared' ? 'Shared' : 'Ready'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        by {file.uploadedBy} • {file.uploadDate}
                        {file.status === 'shared' && (
                          <div className="mt-1 text-blue-600">
                            Permission: {(file as any).permission}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Records:</span>
                          <span className="font-medium">{file.records.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Patients:</span>
                          <span className="font-medium">{file.patients.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Source:</span>
                          <span className="font-medium">{file.dataSource}</span>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          {file.status === 'shared' ? (file as any).sharedWith : 'Personal file'}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => activateFile(file.id)}
                          disabled={activeFiles.length >= 3}
                          className="flex items-center gap-1"
                        >
                          <Play className="h-3 w-3" />
                          Activate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Organization Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  Organization Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold">{demoData.currentUser.organization}</h3>
                    <p className="text-sm text-gray-600">Healthcare Institution • Enterprise Plan</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Total Users</div>
                      <div className="font-medium">{demoData.organizationUsers.length}/50</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Shared Files</div>
                      <div className="font-medium">{demoData.organizationFiles.length}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {demoData.organizationUsers.map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <div className="font-medium text-sm">{user.name}</div>
                        <div className="text-xs text-gray-600">{user.role}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          className={
                            user.status === 'Admin' ? 'border-red-200 text-red-800' :
                            user.status === 'Analyst' ? 'border-blue-200 text-blue-800' :
                            'border-gray-200 text-gray-800'
                          }
                        >
                          {user.status}
                        </Badge>
                        <span className="text-xs text-gray-500">{user.fileCount} files</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Admin Tab */}
        <TabsContent value="admin" className="space-y-6">
          <Card className="bg-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-800">Administrator Controls</CardTitle>
              <CardDescription>
                Organization-wide file and user management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-medium">File Permissions</h4>
                  {demoData.organizationFiles.map((file, index) => (
                    <div key={index} className="text-sm p-3 bg-white rounded border">
                      <div className="font-medium">{file.displayName}</div>
                      <div className="text-gray-600">Shared with: {(file as any).sharedWith}</div>
                      <Button size="sm" variant="outline" className="mt-2">
                        <Settings className="h-3 w-3 mr-1" />
                        Manage Access
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium">User Management</h4>
                  <Button className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add New User
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Roles
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Training Tips */}
      {selectedScenario && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">
              📚 Training: {
                selectedScenario === 'heavy-user' ? 'Heavy User Workflow' :
                selectedScenario === 'team-sharing' ? 'Team Collaboration' :
                'Admin Management'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedScenario === 'heavy-user' && (
              <div className="space-y-2 text-sm">
                <p><strong>Try this:</strong> Activate your third available file above to see the 3-file limit in action.</p>
                <p><strong>Real scenario:</strong> Dr. Johnson analyzes emergency data while comparing with cardiac trends and reviewing outpatient patterns.</p>
                <p><strong>Benefit:</strong> Switch between datasets instantly without losing analysis context or re-uploading files.</p>
              </div>
            )}
            {selectedScenario === 'team-sharing' && (
              <div className="space-y-2 text-sm">
                <p><strong>Try this:</strong> Switch to "Organization Files" tab to see shared research data from Dr. Chen.</p>
                <p><strong>Real scenario:</strong> Research team collaborates on cardiac study data with different permission levels.</p>
                <p><strong>Benefit:</strong> Secure sharing with granular permissions ensures data privacy while enabling collaboration.</p>
              </div>
            )}
            {selectedScenario === 'admin-control' && (
              <div className="space-y-2 text-sm">
                <p><strong>Try this:</strong> Click the "Admin View" tab to see organization-wide controls.</p>
                <p><strong>Real scenario:</strong> Department head manages team access, monitors usage, and controls data sharing.</p>
                <p><strong>Benefit:</strong> Centralized control with audit trails ensures compliance and proper resource management.</p>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={() => setSelectedScenario('')}>
              Close Training
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MultiUserDemoPage;