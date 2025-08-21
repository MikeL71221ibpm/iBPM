import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Upload, Database, TrendingUp, AlertCircle } from "lucide-react";

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  progress?: number;
  details?: string;
  actionRequired?: boolean;
  actionText?: string;
  onAction?: () => void;
}

interface WorkflowProgressIndicatorProps {
  steps: WorkflowStep[];
  currentStep?: string;
  autoAdvanceCountdown?: number;
  onSkipWait?: () => void;
}

const getStepIcon = (step: WorkflowStep) => {
  switch (step.id) {
    case 'upload':
      return <Upload className="h-5 w-5" />;
    case 'import':
      return <Database className="h-5 w-5" />;
    case 'extract':
      return <TrendingUp className="h-5 w-5" />;
    default:
      return <CheckCircle className="h-5 w-5" />;
  }
};

const getStatusColor = (status: WorkflowStep['status']) => {
  switch (status) {
    case 'complete':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'active':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'error':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-400 bg-gray-50 border-gray-200';
  }
};

const getStatusBadge = (status: WorkflowStep['status']) => {
  switch (status) {
    case 'complete':
      return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
    case 'active':
      return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
    case 'error':
      return <Badge variant="destructive">Error</Badge>;
    case 'pending':
      return <Badge variant="outline">Pending</Badge>;
  }
};

export function WorkflowProgressIndicator({ 
  steps, 
  currentStep, 
  autoAdvanceCountdown,
  onSkipWait 
}: WorkflowProgressIndicatorProps) {
  const currentStepData = steps.find(step => step.id === currentStep);
  const completedSteps = steps.filter(step => step.status === 'complete').length;
  const totalSteps = steps.length;
  const overallProgress = (completedSteps / totalSteps) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Data Processing Workflow</span>
          <Badge variant="outline">
            {completedSteps} of {totalSteps} Complete
          </Badge>
        </CardTitle>
        <Progress value={overallProgress} className="w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${getStatusColor(step.status)}`}
          >
            <div className="flex-shrink-0 mt-1">
              {getStepIcon(step)}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{step.title}</h4>
                {getStatusBadge(step.status)}
              </div>
              
              <p className="text-sm opacity-80">{step.description}</p>
              
              {step.details && (
                <p className="text-sm font-medium">{step.details}</p>
              )}
              
              {step.progress !== undefined && step.status === 'active' && (
                <Progress value={step.progress} className="w-full" />
              )}
              
              {step.actionRequired && step.status === 'active' && (
                <div className="flex items-center gap-3 mt-3">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Action Required</span>
                  {step.onAction && (
                    <Button size="sm" onClick={step.onAction}>
                      {step.actionText || 'Continue'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {autoAdvanceCountdown !== undefined && autoAdvanceCountdown > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">
                    Automatically continuing in {autoAdvanceCountdown} seconds...
                  </span>
                </div>
                {onSkipWait && (
                  <Button size="sm" variant="outline" onClick={onSkipWait}>
                    Start Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

export default WorkflowProgressIndicator;