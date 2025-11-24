import axiosConfig from './axiosConfig';

export enum GlobalMessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  REACTION = 'reaction',
}

export interface IGlobalChatMessage {
  id: string;
  message: string;
  sender: {
    user_id: string;
    username: string;
    avatar_url?: string;
  } | null;
  sender_id: string | null;
  type: GlobalMessageType;
  metadata: any;
  created_at: string;
}

export interface GetGlobalChatMessagesResponse {
  data: IGlobalChatMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get global chat messages
 */
export const getGlobalChatMessagesApi = async (
  params?: { page?: number; limit?: number; before?: string }
): Promise<GetGlobalChatMessagesResponse> => {
  const response = await axiosConfig.get('/global-chat/messages', {
    params,
    timeout: 30000,
  });
  return response.data;
};

/**
 * Send a message to global chat
 */
export const sendGlobalChatMessageApi = async (
  message: string,
  type?: GlobalMessageType,
  metadata?: any
): Promise<IGlobalChatMessage> => {
  const response = await axiosConfig.post('/global-chat/messages', {
    message,
    type,
    metadata,
  });
  return response.data;
};

/**
 * Delete a message (admin or owner only)
 */
export const deleteGlobalChatMessageApi = async (messageId: string): Promise<void> => {
  await axiosConfig.delete(`/global-chat/messages/${messageId}`);
};

/**
 * Get a specific message by ID
 */
export const getGlobalChatMessageApi = async (messageId: string): Promise<IGlobalChatMessage> => {
  const response = await axiosConfig.get(`/global-chat/messages/${messageId}`);
  return response.data;
};

