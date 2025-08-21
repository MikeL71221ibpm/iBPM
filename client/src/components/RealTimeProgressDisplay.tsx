import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Database, TrendingUp } from "lucide-react";

interface RealTimeProgressDisplayProps {
  currentSymptoms: number;
  totalNotes: number;
  completionPercentage: number;
  isActive: boolean;
}

export default function RealTimeProgressDisplay({
  currentSymptoms,
  totalNotes,
  completionPercentage,
  isActive
}: RealTimeProgressDisplayProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [symptomsPerSecond, setSymptomsPerSecond] = useState(0);
  const [previousSymptoms, setPreviousSymptoms] = useState(currentSymptoms);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(completionPercentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [completionPercentage]);

  useEffect(() => {
    const now = Date.now();
    const timeDiff = (now - lastUpdateTime) / 1000; // seconds
    const symptomDiff = currentSymptoms - previousSymptoms;
    
    if (timeDiff > 0 && symptomDiff > 0) {
      setSymptomsPerSecond(Math.round(symptomDiff / timeDiff));
    }
    
    setPreviousSymptoms(currentSymptoms);
    setLastUpdateTime(now);
  }, [currentSymptoms]);

  const estimatedTimeRemaining = () => {
    if (symptomsPerSecond === 0 || completionPercentage >= 100) return "Complete";
    const remainingNotes = totalNotes - (totalNotes * completionPercentage / 100);
    const remainingSeconds = remainingNotes / symptomsPerSecond;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Processing Progress
          </span>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Complete"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Completion</span>
            <span className="font-semibold">{completionPercentage.toFixed(2)}%</span>
          </div>
          <Progress 
            value={animatedProgress} 
            className="h-3 transition-all duration-500 ease-out"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Symptoms Extracted</span>
            </div>
            <div className="font-semibold text-lg">
              {currentSymptoms.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">Processing Rate</span>
            </div>
            <div className="font-semibold text-lg">
              {symptomsPerSecond > 0 ? `${symptomsPerSecond}/sec` : "Calculating..."}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-purple-500" />
              <span className="text-muted-foreground">Total Notes</span>
            </div>
            <div className="font-semibold text-lg">
              {totalNotes.toLocaleString()}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-muted-foreground">Time Remaining</span>
            </div>
            <div className="font-semibold text-lg">
              {estimatedTimeRemaining()}
            </div>
          </div>
        </div>

        {isActive && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800">
              <strong>Processing Status:</strong> Actively extracting symptoms from clinical notes using 
              the Symptom_Segments Master file with 3,804 validated patterns.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}