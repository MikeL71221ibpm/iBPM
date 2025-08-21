import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function SymptomMatcherV32Comparison() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [sampleNote, setSampleNote] = useState(
    "Patient reports experiencing anxiety and depression. " +
    "Also mentions difficulty sleeping, fatigue, and trouble concentrating. " +
    "Patient denies suicidal ideation. Reports occasional headaches."
  );
  const { toast } = useToast();

  // Simple function to run the comparison using the sample note
  const runComparison = async () => {
    try {
      setLoading(true);
      setResults(null);

      const response = await fetch('/api/v3.2/symptoms/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note: sampleNote }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
      toast({
        title: "Comparison complete",
        description: "Results are now available to view.",
      });
    } catch (error) {
      console.error("Error running comparison:", error);
      toast({
        title: "Comparison failed",
        description: error.message || "Could not complete the comparison",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runFullComparison = async () => {
    try {
      setLoading(true);
      toast({
        title: "Starting full comparison",
        description: "This may take some time to complete.",
      });

      const response = await fetch('/api/v3.2/algorithm/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sampleSize: 100 }), // Using a reasonable sample size
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      toast({
        title: "Full comparison initiated",
        description: "Check reports later for results.",
      });
    } catch (error) {
      console.error("Error starting full comparison:", error);
      toast({
        title: "Comparison failed",
        description: error.message || "Could not start the full comparison",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLatestReport = async () => {
    try {
      setLoading(true);
      setResults(null);

      const response = await fetch('/api/v3.2/algorithm/reports/latest');

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "No reports found",
            description: "Run a full comparison first to generate reports.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
      toast({
        title: "Report loaded",
        description: "Latest comparison report displayed.",
      });
    } catch (error) {
      console.error("Error getting report:", error);
      toast({
        title: "Failed to load report",
        description: error.message || "Could not load the latest report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Symptom Matcher V3.2 Comparison Tool</h1>
      
      <Tabs defaultValue="sample">
        <TabsList className="mb-4">
          <TabsTrigger value="sample">Sample Comparison</TabsTrigger>
          <TabsTrigger value="full">Full Comparison</TabsTrigger>
          <TabsTrigger value="reports">View Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sample">
          <Card>
            <CardHeader>
              <CardTitle>Test with Sample Note</CardTitle>
              <CardDescription>
                Enter a sample clinical note to compare extraction between V3.0 and V3.2 algorithms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={sampleNote}
                onChange={(e) => setSampleNote(e.target.value)}
                placeholder="Enter a sample clinical note..."
                className="min-h-32 mb-4"
              />
              <Button onClick={runComparison} disabled={loading || !sampleNote.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Comparison
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="full">
          <Card>
            <CardHeader>
              <CardTitle>Full Symptom Set Comparison</CardTitle>
              <CardDescription>
                Run a comparison across all 3,800 symptoms in the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                This will start an asynchronous process that compares both algorithm versions.
                The process may take several minutes to complete. Results will be saved
                to a report that you can view later.
              </p>
              <Button onClick={runFullComparison} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Full Comparison
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Comparison Reports</CardTitle>
              <CardDescription>
                View results from previous algorithm comparisons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={getLatestReport} disabled={loading} className="mb-4">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load Latest Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {results && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Comparison Results</CardTitle>
            <CardDescription>
              Showing performance differences between algorithm versions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.comparison && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="text-lg font-semibold mb-2">Original Algorithm (V3.0)</h3>
                    <p>Extracted symptoms: <Badge variant="outline">{results.comparison.originalAlgorithm.extractedCount}</Badge></p>
                    <p>Unique symptoms: <Badge variant="outline">{results.comparison.originalAlgorithm.uniqueCount}</Badge></p>
                  </div>
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="text-lg font-semibold mb-2">Refined Algorithm (V3.2)</h3>
                    <p>Extracted symptoms: <Badge variant="outline">{results.comparison.v32Algorithm.extractedCount}</Badge></p>
                    <p>Unique symptoms: <Badge variant="outline">{results.comparison.v32Algorithm.uniqueCount}</Badge></p>
                    {results.comparison.v32Algorithm.organizationSummary && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">Organization categories:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="secondary">{results.comparison.v32Algorithm.organizationSummary.bySymptomSegment} Segments</Badge>
                          <Badge variant="secondary">{results.comparison.v32Algorithm.organizationSummary.byDiagnosis} Diagnoses</Badge>
                          <Badge variant="secondary">{results.comparison.v32Algorithm.organizationSummary.byCategory} Categories</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-2">Performance Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p>Shared symptoms: <Badge variant="outline">{results.comparison.sharedCount}</Badge></p>
                      <p>Improvement: <Badge variant={results.comparison.improvement > 0 ? "success" : "destructive"}>
                        {results.comparison.improvement > 0 ? "+" : ""}{results.comparison.improvement} symptoms
                      </Badge></p>
                    </div>
                    <div>
                      <p>Precision: <Badge variant="outline">{(results.comparison.precision * 100).toFixed(1)}%</Badge></p>
                      <p>Recall: <Badge variant="outline">{(results.comparison.recall * 100).toFixed(1)}%</Badge></p>
                    </div>
                  </div>
                </div>

                {results.notePreviews && results.notePreviews.length > 0 && (
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="text-lg font-semibold mb-2">Sample Note Preview</h3>
                    <p className="text-sm text-muted-foreground">Patient ID: {results.notePreviews[0].patient_id}</p>
                    <p className="line-clamp-4 text-sm italic mt-2">"{results.notePreviews[0].preview}"</p>
                  </div>
                )}
              </div>
            )}

            {!results.comparison && (
              <pre className="bg-muted p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Comparison timestamp: {results.timestamp || new Date().toISOString()}
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}