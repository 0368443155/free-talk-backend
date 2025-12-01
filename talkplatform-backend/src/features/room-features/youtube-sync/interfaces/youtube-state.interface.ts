/**
 * YouTube player state
 */
export interface YouTubeState {
  videoId: string | null;
  currentTime: number;
  isPlaying: boolean;
  lastUpdatedBy?: string;
  lastUpdatedAt?: Date;
}

/**
 * YouTube sync event payload
 */
export interface YouTubeSyncPayload {
  videoId?: string;
  currentTime: number;
  isPlaying?: boolean;
  userId?: string;
}

