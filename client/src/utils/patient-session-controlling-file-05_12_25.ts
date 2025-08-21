/**
 * HRSN + BH Analytics Platform
 * Patient Session Utility - Controlling File 05/12/25
 * 
 * This file centralizes and standardizes all patient session operations
 * for consistent data handling across visualization components.
 */

// Constants for session storage keys
export const SESSION_KEYS = {
  PATIENT_ID: 'selectedPatientId',
  PATIENT_NAME: 'selectedPatientName',
  PATIENT_STATUS: 'selectedPatientStatus',
  LAST_SEARCH_TIMESTAMP: 'lastSearchTimestamp',
  VIEW_PREFERENCES: 'viewPreferences'
};

/**
 * Get patient ID from session storage, ensuring consistent type handling
 * @returns string - Patient ID as string or undefined if not found
 */
export function getPatientIdFromSession(): string | undefined {
  const storedId = sessionStorage.getItem(SESSION_KEYS.PATIENT_ID);
  return storedId || undefined;
}

/**
 * Get patient name from session storage
 * @returns string - Patient name or undefined if not found
 */
export function getPatientNameFromSession(): string | undefined {
  const storedName = sessionStorage.getItem(SESSION_KEYS.PATIENT_NAME);
  return storedName || undefined;
}

/**
 * Get patient status from session storage
 * @returns string - Patient status or undefined if not found
 */
export function getPatientStatusFromSession(): string | undefined {
  const storedStatus = sessionStorage.getItem(SESSION_KEYS.PATIENT_STATUS);
  return storedStatus || undefined;
}

/**
 * Check if the patient has "Selected" status in session storage
 * @returns boolean - True if patient has "Selected" status
 */
export function isPatientSelected(): boolean {
  const status = getPatientStatusFromSession();
  return status === "Selected";
}

/**
 * Set patient ID in session storage with proper type conversion
 * @param patientId - Patient ID (can be string or number)
 */
export function setPatientIdInSession(patientId: string | number): void {
  // Always convert to string for consistency
  const patientIdString = String(patientId);
  sessionStorage.setItem(SESSION_KEYS.PATIENT_ID, patientIdString);
  console.log("✅ Successfully set patient ID in session:", patientIdString);
}

/**
 * Set patient name in session storage
 * @param patientName - Patient name
 */
export function setPatientNameInSession(patientName: string): void {
  sessionStorage.setItem(SESSION_KEYS.PATIENT_NAME, patientName);
  console.log("✅ Successfully set patient name in session:", patientName);
}

/**
 * Set patient status in session storage
 * @param status - Patient status (e.g., "Selected")
 */
export function setPatientStatusInSession(status: string): void {
  sessionStorage.setItem(SESSION_KEYS.PATIENT_STATUS, status);
  console.log("✅ Successfully set patient status in session:", status);
}

/**
 * Clear all patient-related data from session storage
 */
export function clearPatientSession(): void {
  sessionStorage.removeItem(SESSION_KEYS.PATIENT_ID);
  sessionStorage.removeItem(SESSION_KEYS.PATIENT_NAME);
  sessionStorage.removeItem(SESSION_KEYS.PATIENT_STATUS);
  console.log("✅ Successfully cleared patient session data");
}

/**
 * Clear all session storage data and reload the page
 */
export function clearAllSessionAndReload(): void {
  sessionStorage.clear();
  console.log("✅ Successfully cleared all session storage");
  setTimeout(() => window.location.reload(), 500);
}

/**
 * Set patient ID with prompt dialog and reload
 * @param currentId - Current patient ID to show in prompt
 */
export function promptAndSetPatientId(currentId?: string | number): void {
  const currentIdString = currentId ? String(currentId) : '';
  const newId = prompt("Enter patient ID to save in sessionStorage:", currentIdString);
  
  if (newId) {
    setPatientIdInSession(newId);
    setPatientStatusInSession("Selected");
    console.log("✅ Successfully set patient ID via prompt with Selected status:", newId);
    setTimeout(() => window.location.reload(), 500);
  }
}

/**
 * Set all patient data at once with "Selected" status
 * @param patientId - Patient ID
 * @param patientName - Patient name 
 */
export function setSelectedPatientData(patientId: string | number, patientName: string): void {
  // Clear existing data first
  clearPatientSession();
  
  // Set all patient data
  const patientIdString = String(patientId);
  sessionStorage.setItem(SESSION_KEYS.PATIENT_ID, patientIdString);
  sessionStorage.setItem(SESSION_KEYS.PATIENT_NAME, patientName);
  sessionStorage.setItem(SESSION_KEYS.PATIENT_STATUS, "Selected");
  
  console.log("✅ Successfully set complete patient data with Selected status:", {
    id: patientIdString,
    name: patientName
  });
}

/**
 * Format patient name for display
 * @param patientId - Patient ID to use if name not available
 * @returns Formatted patient name string
 */
export function getFormattedPatientName(patientId: string | number): string {
  const patientIdString = String(patientId);
  const storedName = getPatientNameFromSession();
  
  if (storedName) {
    return storedName;
  }
  
  // Fallback to formatted ID if name not available
  return `Patient ${patientIdString}`;
}

/**
 * Format patient ID for display (with padding)
 * @param patientId - Raw patient ID
 * @returns Formatted patient ID string (e.g., P0001)
 */
export function getFormattedPatientId(patientId: string | number): string {
  const patientIdString = String(patientId);
  return `P${patientIdString.padStart(4, '0')}`;
}

/**
 * Get complete patient identifier for display
 * @param patientId - Patient ID
 * @param includeStatusIndicator - Whether to include a "✓" status indicator for selected patients
 * @returns Full patient identifier string
 */
export function getPatientIdentifier(patientId: string | number, includeStatusIndicator: boolean = true): string {
  const nameAndId = `${getFormattedPatientName(patientId)} (${getFormattedPatientId(patientId)})`;
  
  // Add "Patient:" prefix if this is the selected patient
  if (includeStatusIndicator && isPatientSelected()) {
    return `Patient: ${nameAndId}`;
  }
  
  return nameAndId;
}

/**
 * Debug function to log all session storage contents
 */
export function debugSessionStorage(): void {
  console.log("🔍 DEBUG: All sessionStorage keys:", Object.keys(sessionStorage));
  
  try {
    const storageSnapshot: Record<string, string | null> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        storageSnapshot[key] = sessionStorage.getItem(key);
      }
    }
    console.log("🔍 DEBUG: Full sessionStorage:", storageSnapshot);
  } catch (e) {
    console.error("Error inspecting sessionStorage:", e);
  }
}