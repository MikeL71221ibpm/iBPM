import { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, ArrowLeft } from 'lucide-react';
import ReceiptRenderer, { Receipt } from '@/components/receipt-renderer';

// Last updated: May 10, 2025 - 3:40 PM
// Controls routes: /receipts/:id

export default function ReceiptDetailPage() {
  const [, params] = useRoute('/receipts/:id');
  const receiptId = params?.id;
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Fetch receipt details
  const { data: receipt, isLoading } = useQuery<Receipt>({
    queryKey: ['/api/receipts', receiptId],
    enabled: !!receiptId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/receipts">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Receipts
              </Button>
            </Link>
            <h1 className="text-3xl font-bold mt-2">Receipt Not Found</h1>
          </div>
        </div>
        <Card className="p-8 text-center">
          <p>The receipt you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button className="mt-4" asChild>
            <Link href="/receipts">View All Receipts</Link>
          </Button>
        </Card>
      </div>
    );
  }
  
  // Ensure receipt has the necessary properties to avoid errors
  const safeReceipt = {
    ...receipt,
    items: receipt.items || [],
    tax: receipt.tax || 0
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/receipts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Receipts
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mt-2">Receipt #{safeReceipt.receiptNumber}</h1>
        </div>
        <Button onClick={() => setShowFullscreen(true)}>
          View Fullscreen
        </Button>
      </div>

      <ReceiptRenderer receipt={safeReceipt} />

      {/* Fullscreen dialog for better viewing/printing */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <ReceiptRenderer 
            receipt={safeReceipt} 
            onClose={() => setShowFullscreen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}