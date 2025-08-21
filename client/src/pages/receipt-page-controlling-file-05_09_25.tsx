/**
 * HRSN-BH Analytics Application
 * Individual Receipt Detail Page Controller
 * 
 * This file controls the /receipts/:id route
 * Displays details of a specific receipt
 * Provides navigation back to receipts list
 * 
 * Last revised: May 9, 2025
 */

import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import ReceiptView from '@/components/ReceiptView';
import { Receipt } from '@shared/schema';

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  
  const { data: receipt, isLoading, error } = useQuery<Receipt>({
    queryKey: [`/api/receipts/${id}`],
    enabled: !!id,
  });
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !receipt) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-lg mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Receipt</h2>
          <p className="text-sm text-red-700">
            {error ? (error as Error).message : 'Could not find the requested receipt.'}
          </p>
        </div>
        <Link href="/home">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" /> 
            Return to Home
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="mb-6">
        <Link href="/receipts">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> 
            Back to Receipts
          </Button>
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6 text-center">Receipt #{receipt.receiptNumber || `R-${Date.now()}`}</h1>
      
      <ReceiptView
        receiptNumber={receipt.receiptNumber || `R-${Date.now()}`}
        receiptDate={receipt.receiptDate ? receipt.receiptDate.toString() : new Date().toISOString()}
        amount={receipt.amount || 0}
        description={receipt.description || 'Health data analysis'}
        itemCount={receipt.itemCount || 1}
        tax={receipt.tax || 0}
        pdfUrl={receipt.pdfUrl}
      />
    </div>
  );
}