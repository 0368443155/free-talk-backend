"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket, io } from 'socket.io-client';
import { useToast } from '@/components/ui/use-toast';
import { IGlobalChatMessage, getGlobalChatMessagesApi, sendGlobalChatMessageApi } from '@/api/global-chat.rest';

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
}

/**
 * Hook for global chat functionality
 */
export function useGlobalChat({ enabled = true }: UseGlobalChatProps = {}): UseGlobalChatReturn {
  const [messages, setMessages] = useState<IGlobalChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const { toast } = useToast();

  // Initialize socket connection
  useEffect(() => {
    if (!enabled) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      console.warn('No access token found for global chat');
      return;
    }

    const baseURL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';
    const socket = io(`${baseURL}/global-chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to global chat');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from global chat');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Global chat connection error:', error);
      setIsConnected(false);
    });

    // Handle incoming messages
    socket.on('chat:message', (data: {
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
        if (exists) return prev;

        // Add new message and sort by timestamp
        const updated = [...prev, newMsg].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Keep only last 200 messages in memory
        return updated.slice(-200);
      });
    });

    // Handle typing indicators
    socket.on('chat:typing', (data: { userId: string; username: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const updated = new Set(prev);
        if (data.isTyping) {
          updated.add(data.username);
        } else {
          updated.delete(data.username);
        }
        return updated;
      });
    });

    // Handle errors
    socket.on('chat:error', (data: { message: string }) => {
      toast({
        title: "Chat Error",
        description: data.message,
        variant: "destructive",
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, toast]);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await getGlobalChatMessagesApi({ page: 1, limit: 50 });
      setMessages(response.data);
    } catch (error: any) {
      if (error.code !== 'ECONNABORTED' && !error.message?.includes('timeout')) {
        console.error("Failed to fetch global chat messages:", error);
      }
    }
  }, []);

  // Send message
  const sendMessage = useCallback(async (message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    if (!socketRef.current?.connected) {
      toast({
        title: "Connection Error",
        description: "Please wait for connection...",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSending(true);
      
      // Send via Socket.IO for real-time
      socketRef.current.emit('chat:message', { message: trimmedMessage });
      
      // Also save via API as backup
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
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchMessages();
    }
  }, [enabled, fetchMessages]);

  return {
    messages,
    isConnected,
    isSending,
    sendMessage,
    fetchMessages,
    typingUsers,
  };
}

