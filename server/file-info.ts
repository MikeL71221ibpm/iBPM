import { Request, Response } from "express";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { fileUploads } from "@shared/schema";
import path from "path";
import fs from "fs";

/**
 * Returns information about the most recently uploaded and processed file
 * This includes both the original file information and the processed file information
 */
export async function getFileInfo(req: Request, res: Response) {
  try {
    // Get the most recent file upload from the database
    const [recentUpload] = await db
      .select()
      .from(fileUploads)
      .orderBy(desc(fileUploads.uploadTime))
      .limit(1);

    if (!recentUpload) {
      return res.status(404).json({
        message: "No file uploads found"
      });
    }

    // Get record counts
    const recordCount = recentUpload.recordCount || 0;
    const patientCount = recentUpload.patientCount || 0;
    
    // Extract the filename (without path) from the original path
    const originalFilename = recentUpload.originalFilename || path.basename(recentUpload.filepath || "");
    
    // Get current active file info
    const activeFile = recentUpload.processedFilepath || "";
    const activeFilename = path.basename(activeFile);
    
    // Format the dates with date part included in the filename
    const uploadDate = new Date(recentUpload.uploadTime);
    const formattedUploadDate = formatDateForFilename(uploadDate);
    
    const processedDate = recentUpload.processedTime 
      ? new Date(recentUpload.processedTime)
      : uploadDate;
    const formattedProcessedDate = formatDateForFilename(processedDate);
    
    // Construct filenames with dates
    const originalFilenameWithDate = addDateToFilename(originalFilename, formattedUploadDate);
    const activeFilenameWithDate = addDateToFilename(activeFilename, formattedProcessedDate);
    
    return res.status(200).json({
      records: recordCount,
      patients: patientCount,
      filename: activeFilenameWithDate,
      originalFilename: originalFilenameWithDate,
      uploadTimestamp: recentUpload.uploadTime,
      processedTimestamp: recentUpload.processedTime || recentUpload.uploadTime,
      filteredRecords: 0,
      filteredPatients: 0,
      fileId: recentUpload.id
    });
  } catch (error) {
    console.error("Error getting file info:", error);
    return res.status(500).json({
      message: "Error retrieving file information",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Format a date as YYYY_MM_DD format for filenames
 */
function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}_${month}_${day}`;
}

/**
 * Add a date to a filename before the extension
 */
function addDateToFilename(filename: string, dateStr: string): string {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  
  // If the filename already has a date in it, don't add another one
  if (base.match(/\d{4}_\d{2}_\d{2}/)) {
    return filename;
  }
  
  return `${base}_${dateStr}${ext}`;
}