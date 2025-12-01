import { MessageType } from '../../../meeting/entities/meeting-chat-message.entity';

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: string;
  message: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  replyTo?: string;
  timestamp: Date;
  type: MessageType;
  metadata?: Record<string, any>;
}

/**
 * Send message interface (for internal use)
 */
export interface SendMessageInterface {
  roomId: string;
  message: string;
  replyTo?: string;
  type?: MessageType;
}

/**
 * Edit message interface (for internal use)
 */
export interface EditMessageInterface {
  messageId: string;
  newMessage: string;
}

/**
 * Delete message interface (for internal use)
 */
export interface DeleteMessageInterface {
  messageId: string;
}

/**
 * React to message interface (for internal use)
 */
export interface ReactToMessageInterface {
  messageId: string;
  reaction: string;
}

