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
 * Send message DTO
 */
export interface SendMessageDto {
  roomId: string;
  message: string;
  replyTo?: string;
  type?: MessageType;
}

/**
 * Edit message DTO
 */
export interface EditMessageDto {
  messageId: string;
  newMessage: string;
}

/**
 * Delete message DTO
 */
export interface DeleteMessageDto {
  messageId: string;
}

/**
 * React to message DTO
 */
export interface ReactToMessageDto {
  messageId: string;
  reaction: string;
}

