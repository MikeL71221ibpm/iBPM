import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import ReceiptRenderer from '@/components/receipt-renderer';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Receipt } from '@/components/receipt-renderer';

export default function SampleReceiptViewer() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the sample receipt data
  useEffect(() => {
    const fetchSampleReceipt = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('GET', '/api/test/sample-receipt');
        const data = await response.json();
        setReceipt(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching sample receipt:', err);
        setError('Failed to load sample receipt data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSampleReceipt();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-6">Sample Receipt Viewer</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-700">{error || 'No receipt data available'}</p>
        </div>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">Sample Receipt Viewer</h1>
      <p className="mb-6 text-muted-foreground">
        This page displays a sample receipt with enhanced formatting and accounting information.
      </p>
      
      <div className="bg-white rounded-lg shadow-lg border p-6 mb-10">
        <ReceiptRenderer receipt={receipt} />
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Receipt Data Structure</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The receipt data follows this JSON structure:
        </p>
        <pre className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto text-xs">
          {JSON.stringify(receipt, null, 2)}
        </pre>
      </div>
    </div>
  );
}