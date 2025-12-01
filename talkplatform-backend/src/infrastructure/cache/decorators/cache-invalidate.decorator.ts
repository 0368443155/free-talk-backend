import { SetMetadata } from '@nestjs/common';

export const CACHE_INVALIDATE_METADATA = 'cache-invalidate';

export interface CacheInvalidateOptions {
  /** Cache key pattern (supports template variables like {{paramName}}) */
  key: string;
  
  /** Key prefix */
  prefix?: string;
  
  /** Whether to invalidate all keys matching pattern */
  all?: boolean;
}

/**
 * Decorator to invalidate cache on method execution
 */
export const CacheInvalidate = (options: CacheInvalidateOptions) =>
  SetMetadata(CACHE_INVALIDATE_METADATA, options);

