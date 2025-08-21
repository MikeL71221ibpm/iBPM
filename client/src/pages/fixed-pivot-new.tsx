import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define the auto pivot page parameter types
interface AutoPivotPageParams {
  patientId?: string;
}

// Define pivot data structure
interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

// Data types for visualization
const DATA_TYPES = [
  { id: "symptom", label: "Symptoms" },
  { id: "diagnosis", label: "Diagnoses" },
  { id: "category", label: "Diagnostic Categories" },
  { id: "hrsn", label: "HRSN Indicators" }
];

// Simple component to display a data table from pivot data
const PivotTable = ({ data }: { data: PivotData | undefined }) => {
  const [sizeOption, setSizeOption] = useState("medium");
  
  if (!data || !data.rows || !data.columns || data.rows.length === 0 || data.columns.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available to display</div>;
  }
  
  // Generate a unique ID for this table
  const tableId = `new-pivot-${Math.random().toString(36).substring(2, 9)}`;

  // Filter to top 25 rows with highest sums for better display
  const rowsWithSums = data.rows.map(row => {
    const sum = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    return { row, sum };
  });
  
  // Sort by sum (descending) and take top 25
  const topRows = rowsWithSums
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 25);

  // Define size configurations
  const sizeStyles = {
    compact: {
      container: { height: "450px" },
      stickyCell: {
        padding: "4px",
        fontSize: "9px",
        width: "150px",
        minWidth: "150px"
      },
      dataCell: {
        padding: "2px 4px",
        width: "30px",
        minWidth: "30px",
        height: "20px",
        fontSize: "9px"
      },
      dateCell: {
        width: "30px",
        minWidth: "30px",
        height: "30px"
      },
      dateLabel: {
        fontSize: "8px"
      }
    },
    medium: {
      container: { height: "600px" },
      stickyCell: {
        padding: "8px",
        fontSize: "11px",
        width: "180px",
        minWidth: "180px"
      },
      dataCell: {
        padding: "8px",
        width: "40px",
        minWidth: "40px",
        height: "28px",
        fontSize: "11px"
      },
      dateCell: {
        width: "40px",
        minWidth: "40px",
        height: "40px"
      },
      dateLabel: {
        fontSize: "10px"
      }
    },
    large: {
      container: { height: "750px" },
      stickyCell: {
        padding: "10px",
        fontSize: "13px",
        width: "220px",
        minWidth: "220px"
      },
      dataCell: {
        padding: "10px",
        width: "50px",
        minWidth: "50px",
        height: "36px",
        fontSize: "13px"
      },
      dateCell: {
        width: "50px",
        minWidth: "50px",
        height: "50px"
      },
      dateLabel: {
        fontSize: "12px"
      }
    }
  };

  // Apply selected size styles
  const sizeConfig = sizeStyles[sizeOption as keyof typeof sizeStyles];

  // Define custom styles for this specific table
  const styles = {
    container: {
      height: sizeConfig.container.height,
      overflow: "auto",
      position: "relative" as const
    },
    table: {
      borderCollapse: "collapse" as const,
      width: "100%"
    },
    tbody: {
      display: "block",
      maxHeight: "calc(100% - 40px)",
      overflow: "auto"
    },
    tfoot: {
      display: "block",
      position: "sticky" as const,
      bottom: 0,
      backgroundColor: "white",
      zIndex: 10,
      boxShadow: "0 -2px 3px rgba(0, 0, 0, 0.05)"
    },
    footerRow: {
      display: "flex",
      height: sizeConfig.dateCell.height
    },
    stickyCell: {
      position: "sticky" as const,
      left: 0,
      zIndex: 10,
      backgroundColor: "rgb(249, 250, 251)",
      width: sizeConfig.stickyCell.width,
      minWidth: sizeConfig.stickyCell.minWidth,
      borderRight: "1px solid rgb(229, 231, 235)",
      padding: sizeConfig.stickyCell.padding,
      fontSize: sizeConfig.stickyCell.fontSize,
      fontWeight: 500
    },
    dataCell: {
      border: "1px solid rgb(229, 231, 235)",
      padding: sizeConfig.dataCell.padding,
      textAlign: "center" as const,
      width: sizeConfig.dataCell.width,
      minWidth: sizeConfig.dataCell.minWidth,
      height: sizeConfig.dataCell.height,
      fontSize: sizeConfig.dataCell.fontSize
    },
    dateCell: {
      width: sizeConfig.dateCell.width,
      minWidth: sizeConfig.dateCell.minWidth,
      height: sizeConfig.dateCell.height,
      position: "relative" as const,
      borderRight: "1px solid rgb(229, 231, 235)"
    },
    dateLabel: {
      position: "absolute" as const,
      left: "8px",
      bottom: "5px",
      transform: "rotate(-45deg)",
      transformOrigin: "bottom left",
      fontSize: sizeConfig.dateLabel.fontSize,
      whiteSpace: "nowrap" as const,
      fontWeight: 600
    },
    toolbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "10px",
      padding: "8px",
      backgroundColor: "#f9fafb",
      borderRadius: "4px"
    },
    controlsContainer: {
      display: "flex",
      alignItems: "center",
      gap: "10px"
    },
    legendContainer: {
      display: "flex",
      flexWrap: "wrap" as const,
      gap: "8px",
      alignItems: "center"
    },
    legendItem: {
      display: "flex",
      alignItems: "center",
      marginRight: "10px"
    },
    colorBox: {
      width: "14px",
      height: "14px",
      border: "1px solid #e5e7eb",
      display: "inline-block",
      marginRight: "4px"
    }
  };

  const getColorClass = (value: number) => {
    if (value === 0) return "bg-white";
    if (value >= 20) return "bg-green-200";
    if (value >= 10) return "bg-teal-200";
    if (value >= 5) return "bg-blue-200";
    return "bg-blue-100";
  };

  // Create legend items
  const legendItems = [
    { level: "bg-white", text: "0 mentions", color: "white" },
    { level: "bg-blue-100", text: "1 mention", color: "#dbeafe" },
    { level: "bg-blue-200", text: "2-4 mentions", color: "#bfdbfe" },
    { level: "bg-teal-200", text: "5-9 mentions", color: "#99f6e4" },
    { level: "bg-green-200", text: "10+ mentions", color: "#86efac" }
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        {/* Legend */}
        <div style={styles.legendContainer}>
          <span style={{ marginRight: "12px", fontWeight: "500", fontSize: "12px" }}>
            Frequency Legend:
          </span>
          {legendItems.map((item, index) => (
            <div key={index} style={styles.legendItem}>
              <span style={{ ...styles.colorBox, backgroundColor: item.color }}></span>
              <span style={{ fontSize: "11px" }}>{item.text}</span>
            </div>
          ))}
        </div>
        
        {/* Controls */}
        <div style={styles.controlsContainer}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <label style={{ fontSize: "12px", marginRight: "5px" }}>Size:</label>
            <select
              value={sizeOption}
              onChange={(e) => setSizeOption(e.target.value)}
              style={{
                fontSize: "12px",
                padding: "2px 4px",
                borderRadius: "4px",
                border: "1px solid #d1d5db"
              }}
            >
              <option value="compact">Compact</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            Download Options (Coming Soon)
          </span>
        </div>
      </div>
      
      {/* Table Container */}
      <div style={styles.container}>
        <table id={tableId} style={styles.table}>
          {/* Main data rows */}
          <tbody>
            {topRows.map(({row, sum}, rowIndex) => (
              <tr key={row} style={{ display: "flex" }}>
                <td style={styles.stickyCell}>
                  {rowIndex + 1}. {row} ({sum})
                </td>
                {data.columns.map(column => {
                  const value = data.data[row]?.[column] || 0;
                  const colorClass = getColorClass(value);
                  
                  return (
                    <td 
                      key={`${row}-${column}`} 
                      className={colorClass}
                      style={styles.dataCell}
                    >
                      {value > 0 ? value : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          
          {/* Date footer row */}
          <tfoot style={styles.tfoot}>
            <tr style={styles.footerRow}>
              {/* Empty cell in the first column */}
              <td style={styles.stickyCell}></td>
              
              {/* Date cells */}
              {data.columns.map((column, colIndex) => (
                <td key={`date-${colIndex}`} style={styles.dateCell}>
                  <div style={styles.dateLabel}>
                    {column}
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// Main component
export default function FixedPivotNew() {
  const { patientId } = useParams<AutoPivotPageParams>();
  const [location, setLocation] = useLocation();
  const [selectedPatient, setSelectedPatient] = useState<string>(patientId || '1');
  const [selectedType, setSelectedType] = useState<string>("symptom");
  
  // Endpoint for the selected data type
  const endpoint = `/api/pivot/${selectedType === 'category' ? 'diagnostic-category' : selectedType}/${selectedPatient}`;
  
  // Create array of patients to select from
  const patientOptions = Array.from({ length: 14 }, (_, i) => ({
    id: (i + 1).toString(),
    name: `Patient ${i + 1}`
  }));

  // Fetch the pivot data
  const { data, isLoading, error, refetch } = useQuery<PivotData>({
    queryKey: [endpoint],
    enabled: !!endpoint,
  });

  // Update the URL when patient changes
  useEffect(() => {
    if (patientId !== selectedPatient) {
      setLocation(`/fixed-pivot-new/${selectedPatient}`);
    }
  }, [selectedPatient, patientId, setLocation]);

  // When patient changes from URL parameter, update the selected patient
  useEffect(() => {
    if (patientId) {
      setSelectedPatient(patientId);
    }
  }, [patientId]);

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Patient Analysis Dashboard (New Fixed Version)</CardTitle>
          <CardDescription>
            Improved visualization of patient data for Patient {selectedPatient}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Select Patient</label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientOptions.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Data Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Data Type" />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPES.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="ml-auto flex items-end gap-4">
              <Button onClick={() => refetch()}>
                Refresh Data
              </Button>
              <Button 
                variant="default" 
                className="bg-blue-600 hover:bg-blue-700" 
                onClick={() => setLocation(`/rollback-viz/${selectedPatient}`)}
              >
                View Heatmaps & Bubble Charts
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                {DATA_TYPES.find(t => t.id === selectedType)?.label || 'Data'} Visualization
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  Error loading data. Please try again.
                </div>
              ) : (
                <div className="mt-4">
                  <PivotTable data={data} />
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}