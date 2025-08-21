import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function RedirectToHeatmap() {
  // Manual navigation is more reliable in this case
  const navigateDirectly = () => {
    window.location.href = '/nivo-heatmap-view/1';
  };

  // Direct link to scatter view as well for comparison
  const navigateToScatter = () => {
    window.location.href = '/nivo-scatter-view/1';
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-lg mx-auto shadow-lg">
        <CardHeader className="bg-slate-50">
          <CardTitle className="text-xl">Visualization Color Theme Test</CardTitle>
          <CardDescription>
            Test the new color theme functionality in both heatmap and scatter views
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Available Color Themes:</h3>
            <ul className="list-disc pl-5 text-sm text-slate-600">
              <li>Iridis (Purple-Blue) - Default</li>
              <li>Viridis (Colorblind-friendly)</li>
              <li>Red-Blue</li>
              <li>Grayscale - NEW!</li>
            </ul>
          </div>
          
          <div className="bg-slate-100 p-3 rounded-md text-sm">
            <p><strong>Note:</strong> The theme dropdown is located in the upper right of each visualization view.</p>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 flex flex-col sm:flex-row gap-3">
          <Button 
            size="lg"
            onClick={navigateDirectly}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Go to Heatmap View
          </Button>
          <Button 
            size="lg"
            onClick={navigateToScatter}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Go to Bubble Chart View
          </Button>
        </CardFooter>
        <div className="p-3 text-xs text-center text-slate-500">
          Direct navigation links:
          <div className="mt-1 flex justify-center gap-2">
            <a href="/nivo-heatmap-view/1" className="underline">Heatmap</a> | 
            <a href="/nivo-scatter-view/1" className="underline">Bubble Chart</a>
          </div>
        </div>
      </Card>
    </div>
  );
}