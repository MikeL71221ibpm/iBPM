import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HrsnTestProps {
  data?: any;
  isLoading?: boolean;
}

export default function HrsnTestSimple({ data, isLoading = false }: HrsnTestProps) {
  console.log("🚀 HRSN Test Component LOADED - data:", data);
  
  if (isLoading) {
    return (
      <div className="text-center py-8">
        Loading HRSN test...
      </div>
    );
  }

  const patients = data?.patients || [];
  
  // Test basic data processing
  const financialStatusCounts = patients.reduce((acc: any, patient: any) => {
    const status = patient.financial_status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HRSN Test - Financial Status</CardTitle>
          <CardDescription>Simple test of {patients.length} patients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(financialStatusCounts).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <span>{status}</span>
                <span className="font-bold">{count as number}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>HRSN Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1">
            <p>Total patients: {patients.length}</p>
            <p>Sample patient keys: {patients[0] ? Object.keys(patients[0]).slice(0, 10).join(', ') : 'None'}</p>
            <p>Component loaded successfully ✓</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}