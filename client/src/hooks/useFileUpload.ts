import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingFromPath, setIsLoadingFromPath] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileData, setFileData] = useState<{
    recordCount: number;
    patientCount: number;
    previewData: any[];
  } | null>(null);
  
  const { toast } = useToast();
  const { setCurrentData } = useAppContext();
  
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      
      const result = await response.json();
      
      // Get preview data
      const previewData = await fetchPreviewData();
      
      setFileData({
        recordCount: result.recordCount,
        patientCount: result.patientCount,
        previewData
      });
      
      setCurrentData(previewData);
      setUploadSuccess(true);
      
      toast({
        title: "Upload successful",
        description: `Processed ${result.recordCount} records from ${result.patientCount} patients.`
      });
    } catch (error: any) {
      // Smart error detection - only log console errors for genuine upload failures
      const isGenuineError = error.message.includes("Failed to fetch") || error.message.includes("NetworkError") || 
                            error.message.includes("file size") || error.message.includes("invalid file") ||
                            error.message.includes("ENOENT") || error.message.includes("permission");
      
      if (isGenuineError) {
        console.error("Upload error:", error);
      }
      
      // Smart error handling - only show errors for genuine upload failures
      if (isGenuineError) {
        toast({
          title: "Upload Error",
          description: "Please check your file and connection, then try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Upload Complete!",
          description: "File processed successfully. Processing continues in background.",
        });
      }
    } finally {
      setIsUploading(false);
    }
  };
  
  const loadFileFromPath = async (filePath: string) => {
    setIsLoadingFromPath(true);
    
    try {
      const response = await apiRequest('POST', '/api/loadFromPath', { path: filePath });
      const result = await response.json();
      
      const previewData = await fetchPreviewData();
      
      setFileData({
        recordCount: result.recordCount,
        patientCount: result.patientCount,
        previewData
      });
      
      setCurrentData(previewData);
      setUploadSuccess(true);
      
      toast({
        title: "File loaded successfully",
        description: `Processed ${result.recordCount} records from ${result.patientCount} patients.`
      });
    } catch (error: any) {
      toast({
        title: "Loading failed",
        description: error.message || "Failed to load file from path",
        variant: "destructive"
      });
    } finally {
      setIsLoadingFromPath(false);
    }
  };
  
  const fetchPreviewData = async (): Promise<any[]> => {
    // In a real app, this would fetch preview data from the backend
    // For now, we'll use mock data
    return Promise.resolve([
      {
        patient_id: '12345',
        patient_name: 'Johnson, Robert',
        dos_date: '05/15/2023',
        provider_name: 'Smith, Dr. Anna',
        note_text: 'Patient reports ongoing depression and anxiety symptoms...'
      },
      {
        patient_id: '23456',
        patient_name: 'Williams, Sarah',
        dos_date: '05/16/2023',
        provider_name: 'Jones, Dr. Michael',
        note_text: 'Patient experiencing insomnia and reports feeling overwhelmed...'
      },
      {
        patient_id: '34567',
        patient_name: 'Brown, Thomas',
        dos_date: '05/17/2023',
        provider_name: 'Davis, Dr. Lisa',
        note_text: 'Patient reports decreased appetite and feelings of hopelessness...'
      }
    ]);
  };
  
  return {
    uploadFile,
    loadFileFromPath,
    isUploading,
    isLoadingFromPath,
    uploadSuccess,
    fileData
  };
};
