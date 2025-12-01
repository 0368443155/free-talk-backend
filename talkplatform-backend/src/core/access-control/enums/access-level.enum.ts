/**
 * Enum defining access levels
 */
export enum AccessLevel {
  /** No access */
  DENIED = 'denied',
  
  /** Read-only access */
  READ = 'read',
  
  /** Read and write access */
  WRITE = 'write',
  
  /** Full access including admin functions */
  ADMIN = 'admin',
}

