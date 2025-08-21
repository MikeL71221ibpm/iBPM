import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { storage } from '../storage';
import { FileUpload, InsertFileUpload } from '@shared/schema';

/**
 * Generates a hash of a file's contents
 * @param filePath Path to the file
 * @returns SHA-256 hash of the file content
 */
export async function getFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('error', (err) => reject(err));
      
      stream.on('data', (chunk) => {
        hash.update(chunk);
      });
      
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get file metadata including size and last modified date
 * @param filePath Path to the file
 */
export function getFileMetadata(filePath: string): { size: number; lastModified: Date } {
  const stats = fs.statSync(filePath);
  return {
    size: stats.size,
    lastModified: stats.mtime
  };
}

/**
 * Check if a file has been processed before by comparing hash and metadata
 * @param filePath Path to the file
 * @param userId User ID who owns the file
 * @returns Previous file record if found, null otherwise
 */
export async function findProcessedFile(
  filePath: string, 
  userId: number
): Promise<FileUpload | null> {
  try {
    // Get the file hash
    const fileHash = await getFileHash(filePath);
    const { size } = getFileMetadata(filePath);
    
    // Get all file uploads for this user
    const userFiles = await storage.getFileUploads(userId);
    
    // Find a matching file by hash and size
    const matchingFile = userFiles.find(file => 
      file.fileHash === fileHash && 
      file.fileSize === size &&
      file.processedStatus === true
    );
    
    return matchingFile || null;
  } catch (error) {
    console.error('Error checking for processed file:', error);
    return null;
  }
}

/**
 * Save file metadata for future cache lookups
 * @param fileUpload File upload record
 * @param filePath Path to the file
 * @param processingTimeMs Processing time in milliseconds
 */
export async function saveFileMetadata(
  fileUpload: FileUpload, 
  filePath: string, 
  processingTimeMs: number
): Promise<FileUpload> {
  try {
    const fileHash = await getFileHash(filePath);
    const { size, lastModified } = getFileMetadata(filePath);
    
    // Update the file record with metadata
    const updatedFileUpload = {
      ...fileUpload,
      fileHash,
      fileSize: size,
      lastModified,
      processingTime: processingTimeMs,
      processedStatus: true
    };
    
    // Save to storage (we need to implement this method)
    return await storage.updateFileUpload(fileUpload.id, updatedFileUpload);
  } catch (error) {
    console.error('Error saving file metadata:', error);
    return fileUpload;
  }
}