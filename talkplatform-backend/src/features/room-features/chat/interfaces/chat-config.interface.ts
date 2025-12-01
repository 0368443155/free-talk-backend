/**
 * Chat configuration
 */
export interface ChatConfig {
  /** Enable chat */
  enabled: boolean;
  
  /** Allow file sharing */
  allowFileSharing: boolean;
  
  /** Allow private messages */
  allowPrivateMessages: boolean;
  
  /** Maximum message length */
  maxMessageLength: number;
  
  /** Rate limit (messages per minute) */
  rateLimit: number;
  
  /** Enable message moderation */
  moderationEnabled: boolean;
  
  /** Enable message editing */
  allowEditing: boolean;
  
  /** Enable message deletion */
  allowDeletion: boolean;
  
  /** Message retention days */
  retentionDays: number;
}

