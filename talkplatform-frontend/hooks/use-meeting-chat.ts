"use client";

import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useToast } from '@/components/ui/use-toast';
import { IMeetingChatMessage, MessageType } from '@/api/meeting.rest';
import { getMeetingChatApi, getPublicMeetingChatApi } from '@/api/meeting.rest';

interface UseMeetingChatProps {
  socket: Socket | null;
  meetingId: string;
  isPublicMeeting: boolean;
  classroomId?: string;
  isOnline: boolean;
}

interface UseMeetingChatReturn {
  chatMessages: IMeetingChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<IMeetingChatMessage[]>>;
  handleSendMessage: (message: string) => Promise<void>;
  fetchChatMessages: () => Promise<void>;
}

/**
 * Shared hook for meeting chat functionality
 * Used by both Traditional Meeting and LiveKit Meeting
 */
export function useMeetingChat({
  socket,
  meetingId,
  isPublicMeeting,
  classroomId,
  isOnline,
}: UseMeetingChatProps): UseMeetingChatReturn {
  const [chatMessages, setChatMessages] = useState<IMeetingChatMessage[]>([]);
  const { toast } = useToast();

  // Handle incoming chat messages from socket
  const handleChatMessage = useCallback((data: {
    id: string;
    message: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    timestamp: string;
    type?: string;
  }) => {
    const newMsg: IMeetingChatMessage = {
      id: data.id || `socket-${Date.now()}-${data.senderId}`,
      message: data.message,
      sender: {
        user_id: data.senderId,
        name: data.senderName || 'Unknown User',
        avatar_url: data.senderAvatar || '',
      } as any,
      type: (data.type as MessageType) || MessageType.TEXT,
      created_at: data.timestamp || new Date().toISOString(),
      metadata: null,
    } as any;

    setChatMessages(prev => {
      // Check if message already exists by ID (prevent duplicates)
      const exists = prev.some(msg => msg.id === newMsg.id);
      if (exists) {
        console.log('💬 [CHAT] Message already exists, skipping:', newMsg.id);
        return prev;
      }
      
      console.log('💬 [CHAT] Adding new message to state');
      // Add new message and sort by timestamp
      const updated = [...prev, newMsg].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      return updated;
    });
  }, []);

  const handleChatError = useCallback((data: { message: string }) => {
    toast({
      title: "Chat Error",
      description: data.message,
      variant: "destructive",
    });
  }, [toast]);

  // Setup socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('chat:message', handleChatMessage);
    socket.on('chat:error', handleChatError);

    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:error', handleChatError);
    };
  }, [socket, handleChatMessage, handleChatError]);

  // Fetch chat messages from API
  const fetchChatMessages = useCallback(async () => {
    try {
      const response = isPublicMeeting
        ? await getPublicMeetingChatApi(meetingId, { page: 1, limit: 100 })
        : await getMeetingChatApi(classroomId!, meetingId, { page: 1, limit: 100 });
      
      setChatMessages(prevMessages => {
        const fetchedMessages = response.data.reverse();
        const existingIds = new Set(prevMessages.map(msg => msg.id));
        const newMessages = fetchedMessages.filter(msg => !existingIds.has(msg.id));
        
        if (newMessages.length > 0) {
          const allMessages = [...prevMessages, ...newMessages].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          return allMessages;
        }
        return prevMessages;
      });
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    }
  }, [meetingId, isPublicMeeting, classroomId]);

  // Send message via socket
  const handleSendMessage = useCallback(async (message: string) => {
    if (!socket?.connected) {
      toast({
        title: "Connection Error",
        description: "Please wait for connection...",
        variant: "destructive",
      });
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    try {
      // Only send via Socket.IO
      // Server will broadcast back with proper ID, so we don't need optimistic update
      socket.emit('chat:message', { message: trimmedMessage });
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send message.",
        variant: "destructive",
      });
    }
  }, [socket, toast]);

  return {
    chatMessages,
    setChatMessages,
    handleSendMessage,
    fetchChatMessages,
  };
}

