// Admin utility functions for secure admin management
export const MASTER_ADMIN_EMAIL = 'MikeL71221@gmail.com';

/**
 * Check if a user has admin privileges
 * Three ways to be admin:
 * 1. is_admin = true in database
 * 2. role = 'admin' 
 * 3. Email matches master admin (case-insensitive)
 */
export function isUserAdmin(user: any): boolean {
  if (!user) return false;
  
  // Check database admin flag
  if (user.isAdmin || user.is_admin) return true;
  
  // Check role
  if (user.role === 'admin') return true;
  
  // Check if email matches master admin (case-insensitive)
  if (user.email && user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  
  return false;
}

/**
 * Check if a user is the master admin (protected account)
 * Master admin cannot be deleted or have privileges removed
 */
export function isMasterAdmin(email: string): boolean {
  return email && email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Validate admin operations
 * Returns error message if operation is not allowed, null if allowed
 */
export function validateAdminOperation(
  currentUser: any,
  targetEmail: string,
  operation: 'delete' | 'modify' | 'toggle-admin'
): string | null {
  // First check if current user has admin rights
  if (!isUserAdmin(currentUser)) {
    return 'Admin access required';
  }
  
  // Check if trying to modify master admin
  if (isMasterAdmin(targetEmail)) {
    switch (operation) {
      case 'delete':
        return 'Cannot delete master admin account';
      case 'modify':
        return 'Cannot modify master admin account';
      case 'toggle-admin':
        return 'Cannot remove admin privileges from master admin account';
    }
  }
  
  return null; // Operation allowed
}