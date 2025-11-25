"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useToast } from '@/components/ui/use-toast';
import { IGlobalChatMessage, getGlobalChatMessagesApi, sendGlobalChatMessageApi } from '@/api/global-chat.rest';
import { useGlobalChatSocket } from './use-global-chat-socket';

interface UseGlobalChatProps {
  enabled?: boolean;
}

interface UseGlobalChatReturn {
  messages: IGlobalChatMessage[];
  isConnected: boolean;
  isSending: boolean;
  sendMessage: (message: string) => Promise<void>;
  fetchMessages: () => Promise<void>;
  typingUsers: Set<string>;
  sendTyping: (isTyping: boolean) => void;
}

/**
 * Hook for global chat functionality
 * Uses socket from useGlobalChatSocket (similar to meeting chat pattern)
 */
export function useGlobalChat({ enabled = true }: UseGlobalChatProps = {}): UseGlobalChatReturn {
  const [messages, setMessages] = useState<IGlobalChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Get socket from dedicated socket hook (similar to meeting chat)
  const { socket, isConnected } = useGlobalChatSocket({ enabled });

  // Setup socket listeners (similar to useMeetingChat)
  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages
    const handleChatMessage = (data: {
      id: string;
      message: string;
      senderId: string;
      senderName: string;
      senderAvatar?: string;
      timestamp: string;
      type?: string;
      metadata?: any;
    }) => {
      const newMsg: IGlobalChatMessage = {
        id: data.id,
        message: data.message,
        sender: {
          user_id: data.senderId,
          username: data.senderName || 'Unknown User',
          avatar_url: data.senderAvatar || undefined,
        },
        sender_id: data.senderId,
        type: (data.type as any) || 'text',
        metadata: data.metadata || null,
        created_at: data.timestamp || new Date().toISOString(),
      };

      setMessages(prev => {
        // Check if message already exists (prevent duplicates)
        const exists = prev.some(msg => msg.id === newMsg.id);
        if (exists) {
          console.log('💬 [GLOBAL CHAT] Message already exists, skipping:', newMsg.id);
          return prev;
        }

        console.log('💬 [GLOBAL CHAT] Adding new message to state');
        // Add new message and sort by timestamp
        const updated = [...prev, newMsg].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Keep only last 200 messages in memory
        return updated.slice(-200);
      });
    };

    // Handle typing indicators
    const handleTyping = (data: { userId: string; username: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const updated = new Set(prev);
        if (data.isTyping) {
          updated.add(data.username);
        } else {
          updated.delete(data.username);
        }
        return updated;
      });
    };

    // Handle errors
    const handleChatError = (data: { message: string }) => {
      toast({
        title: "Chat Error",
        description: data.message,
        variant: "destructive",
      });
    };

    socket.on('chat:message', handleChatMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:error', handleChatError);

    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:error', handleChatError);
    };
  }, [socket, toast]);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await getGlobalChatMessagesApi({ page: 1, limit: 50 });
      console.log('📥 [GLOBAL CHAT] Fetched messages:', response.data.length);
      console.log('📥 [GLOBAL CHAT] First message sample:', response.data[0]);
      // Ensure all messages have proper sender format
      const normalizedMessages = response.data.map((msg: IGlobalChatMessage) => {
        if (msg.sender && !msg.sender.user_id && (msg.sender as any).id) {
          // Transform if backend returns sender.id instead of sender.user_id
          return {
            ...msg,
            sender: {
              user_id: (msg.sender as any).id,
              username: msg.sender.username,
              avatar_url: msg.sender.avatar_url,
            },
            sender_id: (msg.sender as any).id || msg.sender_id,
          };
        }
        return msg;
      });
      setMessages(normalizedMessages);
    } catch (error: any) {
      if (error.code !== 'ECONNABORTED' && !error.message?.includes('timeout')) {
        console.error("Failed to fetch global chat messages:", error);
      }
    }
  }, []);

  const hasFetchedRef = useRef(false);
  
  // Re-fetch messages after reconnection (only once per connection)
  useEffect(() => {
    if (isConnected && socket && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchMessages();
    } else if (!isConnected) {
      // Reset flag when disconnected
      hasFetchedRef.current = false;
    }
  }, [isConnected, socket, fetchMessages]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (!socket?.connected) return;
    
    socket.emit('chat:typing', { isTyping });
    
    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit('chat:typing', { isTyping: false });
      }, 3000);
    }
  }, [socket]);

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    if (!socket?.connected) {
      toast({
        title: "Connection Error",
        description: "Please wait for connection...",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSending(true);
      
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      socket.emit('chat:typing', { isTyping: false });
      
      // Send via Socket.IO for real-time (similar to meeting chat)
      // Server will broadcast back with proper ID, so we don't need optimistic update
      socket.emit('chat:message', { message: trimmedMessage });
      
      // Also save via API as backup (optional)
      try {
        await sendGlobalChatMessageApi(trimmedMessage);
      } catch (apiError) {
        // API call is optional, socket is primary
        console.warn('Failed to save message via API:', apiError);
      }
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }, [socket, toast]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Initial fetch (only if not already fetched via connection)
  useEffect(() => {
    if (enabled && !hasFetchedRef.current) {
      // Only fetch if socket is not connected yet (fallback)
      if (!isConnected) {
        fetchMessages();
        hasFetchedRef.current = true;
      }
    }
  }, [enabled, isConnected, fetchMessages]);

  return {
    messages,
    isConnected,
    isSending,
    sendMessage,
    fetchMessages,
    typingUsers,
    sendTyping,
  };
}

