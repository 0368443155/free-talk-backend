import { Permission } from '../enums/permission.enum';
import { AccessLevel } from '../enums/access-level.enum';

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  /** Whether permission is granted */
  granted: boolean;
  
  /** Required permission */
  required: Permission;
  
  /** User's access level */
  accessLevel?: AccessLevel;
  
  /** Reason for denial */
  reason?: string;
}

/**
 * Interface for permission checkers
 */
export interface IPermissionChecker {
  /**
   * Check if user has permission
   */
  hasPermission(
    userId: string,
    permission: Permission,
    context?: Record<string, any>,
  ): Promise<PermissionCheckResult>;
  
  /**
   * Get user's access level
   */
  getAccessLevel(userId: string, context?: Record<string, any>): Promise<AccessLevel>;
}

