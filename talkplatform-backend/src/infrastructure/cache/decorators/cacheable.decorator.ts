import { SetMetadata } from '@nestjs/common';

export const CACHEABLE_METADATA = 'cacheable';

export interface CacheableOptions {
  /** Cache key (supports template variables like {{paramName}}) */
  key: string;
  
  /** Time to live in seconds */
  ttl?: number;
  
  /** Key prefix */
  prefix?: string;
}

/**
 * Decorator to cache method result
 */
export const Cacheable = (options: CacheableOptions) =>
  SetMetadata(CACHEABLE_METADATA, options);

