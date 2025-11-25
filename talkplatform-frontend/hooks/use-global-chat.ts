"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useToast } from '@/components/ui/use-toast';
import { IGlobalChatMessage, getGlobalChatMessagesApi } from '@/api/global-chat.rest';
import { useGlobalChatSocket } from './use-global-chat-socket';

interface UseGlobalChatProps {
  enabled?: boolean;
}

interface UseGlobalChatReturn {
  messages: IGlobalChatMessage[];
  isConnected: boolean;
  isSending: boolean;
  sendMessage: (message: string, currentUser?: { id: string; username: string; avatar_url?: string }) => Promise<void>;
  fetchMessages: () => Promise<void>;
  typingUsers: Set<string>;
  sendTyping: (isTyping: boolean) => void;
}

/**
 * Hook for global chat functionality - ONLY uses socket (no API fetch)
 * Similar to meeting chat but simpler - messages only come from socket
 */
export function useGlobalChat({ enabled = true }: UseGlobalChatProps = {}): UseGlobalChatReturn {
  const [messages, setMessages] = useState<IGlobalChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Get socket from dedicated socket hook (similar to meeting chat)
  const { socket, isConnected } = useGlobalChatSocket({ enabled });

  // Handle incoming messages - EXACT same pattern as meeting chat
  const handleChatMessage = useCallback((data: {
    id: string;
    message: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    timestamp: string;
    type?: string;
    metadata?: any;
  }) => {
    // Normalize senderId to ensure consistency
    const normalizedSenderId = data.senderId || '';
    
    const newMsg: IGlobalChatMessage = {
      id: data.id,
      message: data.message,
      sender: {
        user_id: normalizedSenderId,
        username: data.senderName || 'Unknown User',
        avatar_url: data.senderAvatar || undefined,
      },
      sender_id: normalizedSenderId,
      type: (data.type as any) || 'text',
      metadata: data.metadata || null,
      created_at: data.timestamp || new Date().toISOString(),
    };

    setMessages(prev => {
      // Check if message already exists by ID (prevent duplicates) - EXACT same as meeting chat
      const exists = prev.some(msg => msg.id === newMsg.id);
      if (exists) {
        return prev;
      }
      
      // Check for optimistic messages (temp-*) with same message and sender - replace them
      // Match by message content and sender username (more reliable than sender_id)
      // Also check if message was sent recently (within 5 seconds) to avoid false matches
      const now = Date.now();
      const optimisticIndex = prev.findIndex(msg => {
        if (!msg.id.startsWith('temp-')) return false;
        
        // Match by message content (trimmed)
        const messageMatch = msg.message.trim() === newMsg.message.trim();
        if (!messageMatch) return false;
        
        // Match by sender username (most reliable)
        const usernameMatch = msg.sender?.username === newMsg.sender?.username;
        
        // Match by sender_id (fallback)
        const senderIdMatch = msg.sender_id === newMsg.sender_id || 
                             msg.sender?.user_id === newMsg.sender_id ||
                             msg.sender_id === newMsg.sender?.user_id;
        
        // Check if message was sent recently (within 5 seconds)
        const msgTime = new Date(msg.created_at).getTime();
        const isRecent = (now - msgTime) < 5000;
        
        return (usernameMatch || senderIdMatch) && isRecent;
      });
      
      if (optimisticIndex >= 0) {
        // Replace optimistic message with real one
        const updated = [...prev];
        updated[optimisticIndex] = newMsg;
        return updated.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ).slice(-200);
      }
      
      // Add new message and sort by timestamp
      const updated = [...prev, newMsg].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      // Keep only last 200 messages in memory
      return updated.slice(-200);
    });
  }, []);

  // Handle typing indicators
  const handleTyping = useCallback((data: { userId: string; username: string; isTyping: boolean }) => {
    setTypingUsers(prev => {
      const updated = new Set(prev);
      if (data.isTyping) {
        updated.add(data.username);
      } else {
        updated.delete(data.username);
      }
      return updated;
    });
  }, []);

  // Handle errors
  const handleChatError = useCallback((data: { message: string }) => {
    toast({
      title: "Chat Error",
      description: data.message,
      variant: "destructive",
    });
  }, [toast]);

  // Setup socket listeners (exact same pattern as useMeetingChat)
  useEffect(() => {
    if (!socket) return;

    socket.on('chat:message', handleChatMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:error', handleChatError);

    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:error', handleChatError);
    };
  }, [socket, handleChatMessage, handleTyping, handleChatError]);

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

  // Send message - ONLY via socket (like meeting chat - no API call)
  // Add optimistic update to show message immediately on the right side
  const sendMessage = useCallback(async (message: string, currentUser?: { id: string; username: string; avatar_url?: string }) => {
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
      
      // Optimistic update - add message immediately with temporary ID
      // This ensures it shows on the right side (as own message) immediately
      // IMPORTANT: Use the same user_id format as backend (user.id or user.user_id)
      if (currentUser) {
        // Normalize user_id to match backend format (use id first, fallback to user_id)
        // Backend uses user.id from JWT, so we should use the same format
        const normalizedUserId = currentUser.id || (currentUser as any).user_id || '';
        
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const optimisticMessage: IGlobalChatMessage = {
          id: tempId,
          message: trimmedMessage,
          sender: {
            user_id: normalizedUserId,
            username: currentUser.username,
            avatar_url: currentUser.avatar_url,
          },
          sender_id: normalizedUserId, // Use normalized user_id to match backend
          type: 'text' as any,
          metadata: null,
          created_at: new Date().toISOString(),
        };

        setMessages(prev => {
          // Check if optimistic message already exists (prevent duplicates)
          const exists = prev.some(msg => 
            msg.id === tempId || 
            (msg.id.startsWith('temp-') && msg.message === trimmedMessage && msg.sender_id === currentUser.id)
          );
          if (exists) {
            return prev;
          }
          
          const updated = [...prev, optimisticMessage].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          return updated.slice(-200);
        });
      }
      
      // Send via Socket.IO - server will broadcast back with proper ID
      socket.emit('chat:message', { message: trimmedMessage });
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

  // Fetch chat messages from API (EXACT same pattern as meeting chat)
  const fetchMessages = useCallback(async () => {
    try {
      const response = await getGlobalChatMessagesApi({ page: 1, limit: 100 });
      
      setMessages(prevMessages => {
        const fetchedMessages = response.data.reverse();
        const existingIds = new Set(prevMessages.map(msg => msg.id));
        const newMessages = fetchedMessages.filter(msg => !existingIds.has(msg.id));
        
        if (newMessages.length > 0) {
          const allMessages = [...prevMessages, ...newMessages].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          return allMessages.slice(-200); // Keep only last 200
        }
        return prevMessages;
      });
    } catch (error: any) {
      // Silently fail for timeout errors - will retry on next poll
      // Only log non-timeout errors
      if (error.code !== 'ECONNABORTED' && !error.message?.includes('timeout')) {
        console.error("Failed to fetch global chat messages:", error);
      }
    }
  }, []);

  // Fetch messages when connected (only once) - EXACT same pattern as meeting chat
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (isConnected && socket && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchMessages();
    } else if (!isConnected) {
      // Reset flag when disconnected
      hasFetchedRef.current = false;
    }
  }, [isConnected, socket, fetchMessages]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

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
