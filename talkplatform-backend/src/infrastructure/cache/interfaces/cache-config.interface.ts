/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Time to live in seconds */
  ttl?: number;
  
  /** Cache key prefix */
  keyPrefix?: string;
  
  /** Whether to use Redis */
  useRedis?: boolean;
  
  /** Maximum cache size (for in-memory cache) */
  maxSize?: number;
}

/**
 * Cache key builder options
 */
export interface CacheKeyOptions {
  /** Key prefix */
  prefix?: string;
  
  /** Key parts */
  parts: (string | number)[];
  
  /** Separator */
  separator?: string;
}

