/**
 * YouTube configuration
 */
export interface YouTubeConfig {
  /** Enable YouTube sync */
  enabled: boolean;
  
  /** Only host can control */
  hostOnlyControl: boolean;
  
  /** Auto-sync interval (seconds) */
  syncInterval: number;
  
  /** Maximum video length (seconds) */
  maxVideoLength: number;
  
  /** Allowed video sources */
  allowedSources?: string[];
}

