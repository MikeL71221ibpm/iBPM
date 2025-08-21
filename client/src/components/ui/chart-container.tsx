import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Maximize } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  patientCount?: number;
  recordCount?: number;
  onDownload: () => void;
  onEnlarge: () => void;
  children: React.ReactNode;
}

export function ChartContainer({
  title,
  patientCount = 24,
  recordCount = 1061,
  onDownload,
  onEnlarge,
  children
}: ChartContainerProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-2 pb-0">
        <CardTitle className="text-sm">{title}</CardTitle>
        <div className="text-xs text-gray-500 mt-0.5">
          n={patientCount} patients • n={recordCount} records
        </div>
      </CardHeader>
      <CardContent className="p-2 h-[225px]">
        {children}
      </CardContent>
      <CardFooter className="p-2 pt-0 flex justify-end gap-2">
        <Button 
          size="sm" 
          variant="outline"
          onClick={onEnlarge}
        >
          <Maximize className="h-4 w-4 mr-2" />
          Enlarge
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          onClick={onDownload}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Chart
        </Button>
      </CardFooter>
    </Card>
  );
}