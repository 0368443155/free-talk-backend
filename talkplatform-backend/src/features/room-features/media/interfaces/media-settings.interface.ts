/**
 * Media quality settings
 */
export interface MediaQualitySettings {
  /** Video resolution */
  resolution?: 'low' | 'medium' | 'high' | 'ultra';
  
  /** Frame rate */
  frameRate?: number;
  
  /** Bitrate */
  bitrate?: number;
  
  /** Audio quality */
  audioQuality?: 'low' | 'medium' | 'high';
}

/**
 * Bandwidth settings
 */
export interface BandwidthSettings {
  /** Maximum upload bandwidth (kbps) */
  maxUploadBandwidth?: number;
  
  /** Maximum download bandwidth (kbps) */
  maxDownloadBandwidth?: number;
  
  /** Adaptive bitrate */
  adaptiveBitrate?: boolean;
}

