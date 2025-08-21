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

// Last updated: May 10, 2025 - 4:25 AM
// Controls routes: /receipts and /billing

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
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mt-2">Billing & Receipts</h1>
          <p className="text-muted-foreground mt-1">
            View and download your billing history
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !receipts || receipts.length === 0 ? (
          <div className="text-center p-12">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No Receipts Available</h2>
            <p className="mt-2 text-muted-foreground">
              You haven't made any payments yet. Receipts will appear here after you make a payment.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/payment">Make a Payment</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Receipt ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>{formatDate(receipt.createdAt)}</TableCell>
                  <TableCell className="font-mono text-xs">{receipt.id.substring(0, 8)}...</TableCell>
                  <TableCell>
                    <div className="font-medium">{receipt.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(receipt.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      receipt.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : receipt.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/receipts/${receipt.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="bg-blue-500 text-white hover:bg-blue-600 hover:text-white">
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
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