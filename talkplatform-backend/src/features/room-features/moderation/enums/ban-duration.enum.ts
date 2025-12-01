/**
 * Ban duration enum
 */
export enum BanDuration {
  /** Temporary ban - 1 hour */
  ONE_HOUR = 3600,
  
  /** Temporary ban - 1 day */
  ONE_DAY = 86400,
  
  /** Temporary ban - 1 week */
  ONE_WEEK = 604800,
  
  /** Permanent ban */
  PERMANENT = -1,
}

