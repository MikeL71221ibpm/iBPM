// Patient utility functions for consistent patient data handling

export function getPatientIdFromSession(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('selectedPatientId');
}

export function getPatientStatusFromSession(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('selectedPatientStatus');
}

export function setPatientInSession(patientId: string, status: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('selectedPatientId', patientId);
  sessionStorage.setItem('selectedPatientStatus', status);
}

export function getFormattedPatientName(patientId: string | number): string {
  // Convert to string and ensure it's properly formatted
  const id = String(patientId);
  
  // If it looks like a patient ID (numeric), format it nicely
  if (/^\d+$/.test(id)) {
    return id.padStart(7, '0'); // Pad to 7 digits with leading zeros
  }
  
  return id;
}

export function clearPatientSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('selectedPatientId');
  sessionStorage.removeItem('selectedPatientStatus');
}