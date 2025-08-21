import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableCell, 
  TableBody 
} from '@/components/ui/table';
import { Loader2, ArrowLeft, Receipt, Download, Eye } from 'lucide-react';
import { Receipt as ReceiptType } from '@shared/schema';
import { format } from 'date-fns';

export default function ReceiptsPage() {
  const { data: receipts, isLoading } = useQuery<ReceiptType[]>({
    queryKey: ['/api/receipts'],
  });
  
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  }
  
  function formatDate(dateString: string | Date) {
    return format(new Date(dateString), 'MMM d, yyyy');
  }
  
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/home">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Billing & Payments</h1>
        <div>
          <Link href="/payment">
            <Button size="sm" variant="default">
              <Receipt className="h-4 w-4 mr-2" />
              Register Payment Method
            </Button>
          </Link>
        </div>
      </div>
      
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !receipts || receipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Receipts Found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              You don't have any receipts yet. Complete a search to generate a receipt.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-mono text-sm">
                    {receipt.receiptNumber}
                  </TableCell>
                  <TableCell>
                    {receipt.receiptDate ? formatDate(receipt.receiptDate) : '—'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {receipt.description || 'Health data analysis'}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(receipt.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Link href={`/receipts/${receipt.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                      <a href={`/api/receipts/${receipt.id}/download`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}