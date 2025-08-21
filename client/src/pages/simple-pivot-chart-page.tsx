import React from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import SimplePivotChart from '@/components/SimplePivotChart';

const SimplePivotChartPage: React.FC = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="p-0 mr-4"
          onClick={() => setLocation('/')}
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          <span>Back</span>
        </Button>
        <h1 className="text-3xl font-bold">Pivot Chart Tool</h1>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <SimplePivotChart />
      </div>
    </div>
  );
};

export default SimplePivotChartPage;