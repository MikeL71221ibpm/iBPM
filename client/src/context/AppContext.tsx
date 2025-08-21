import { createContext, useContext, useState, ReactNode } from "react";

interface SearchConfig {
  searchType: "individual" | "population";
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  useAllDates?: boolean;
  useCachedData?: boolean;
  userInitiated?: boolean;
  matchType?: string; // Added to support matchType: "exact" in API requests
}

interface FileInfo {
  fileName?: string;
  totalRecords?: number;
  patientCount?: number;
  patients?: any[];
  status?: string;
  filePath?: string;
}

interface SearchResults {
  patients: any[];
  totalRecords?: number;
  [key: string]: any;
}

interface AppContextType {
  isLoaded: boolean;
  isLoading: boolean;
  searchConfig: SearchConfig | null;
  currentSearchConfig: SearchConfig | null;
  updateSearchConfig: (config: SearchConfig) => void;
  downloadCurrentData: () => void;
  currentData: any | null;
  setCurrentData: (data: any) => void;
  extractedData: any | null;
  setExtractedData: (data: any) => void;
  fileInfo: FileInfo | null;
  searchResults: SearchResults | null;
  runPopulationSearch: (config: SearchConfig) => Promise<void>;
  runIndividualSearch: (config: SearchConfig) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchConfig, setSearchConfig] = useState<SearchConfig | null>(null);
  const [currentSearchConfig, setCurrentSearchConfig] = useState<SearchConfig | null>(null);
  const [currentData, setCurrentData] = useState<any | null>(null);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>({
    fileName: "Symptom_Segments_asof_4_30_25_MASTER.csv",
    totalRecords: 6280,
    patients: Array(24).fill({}), // Mock array with 24 entries
    status: "loaded"
  });
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  const updateSearchConfig = (config: SearchConfig) => {
    // If changing search types, clear current data
    if (searchConfig?.searchType !== config.searchType) {
      setCurrentData(null);
      setExtractedData(null);
    }
    
    setSearchConfig(config);
  };

  const runPopulationSearch = async (config: SearchConfig): Promise<void> => {
    setIsLoading(true);
    setCurrentSearchConfig(config);
    
    try {
      // Simulate API call
      console.log("Running population search with config:", config);
      
      // In a real implementation, we would call an API here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set mock results based on fileInfo
      const mockResults = {
        patients: fileInfo?.patients || [],
        totalRecords: fileInfo?.totalRecords || 0
      };
      
      setSearchResults(mockResults);
    } catch (error) {
      console.error("Error in population search:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const runIndividualSearch = async (config: SearchConfig): Promise<void> => {
    setIsLoading(true);
    setCurrentSearchConfig(config);
    
    try {
      // Simulate API call
      console.log("Running individual search with config:", config);
      
      // In a real implementation, we would call an API here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set mock results based on fileInfo
      const mockResults = {
        patients: [fileInfo?.patients?.[0]].filter(Boolean),
        totalRecords: 1
      };
      
      setSearchResults(mockResults);
    } catch (error) {
      console.error("Error in individual search:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCurrentData = () => {
    if (!currentData) return;

    // Convert the data to CSV
    const replacer = (key: string, value: any) => value === null ? '' : value;
    const header = Object.keys(currentData[0]);
    let csv = currentData.map((row: any) =>
      header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(',')
    );
    csv.unshift(header.join(','));
    const csvString = csv.join('\r\n');

    // Create a download link
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'behavioral_health_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppContext.Provider
      value={{
        isLoaded,
        isLoading,
        searchConfig,
        currentSearchConfig,
        updateSearchConfig,
        downloadCurrentData,
        currentData,
        setCurrentData,
        extractedData,
        setExtractedData,
        fileInfo,
        searchResults,
        runPopulationSearch,
        runIndividualSearch
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppContextProvider");
  }
  return context;
};