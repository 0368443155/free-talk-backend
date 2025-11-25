"use client";

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from '@/store/user-store';

interface UseGlobalChatSocketProps {
  enabled?: boolean;
}

interface UseGlobalChatSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
}

/**
 * Hook for global chat socket connection
 * Similar to useMeetingSocket but for global chat namespace
 */
export function useGlobalChatSocket({ enabled = true }: UseGlobalChatSocketProps = {}): UseGlobalChatSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const connectionAttempts = useRef(0);
  const maxAttempts = 3; // Same as meeting socket
  const { userInfo } = useUser(); // Get user from store (similar to meeting socket pattern)

  useEffect(() => {
    if (!enabled) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // If socket already exists and is connected, don't create a new one
    if (socketRef.current?.connected) {
      console.log('✅ Global chat socket already connected, reusing...');
      return;
    }

    // Get userId from user store (similar to meeting socket pattern)
    // Meeting socket gets userId from props, but for global chat we get from user store
    const userId = userInfo?.id || userInfo?.user_id;
    
    if (!userId) {
      console.log('⏸️ Global chat socket connection paused - no userId:', { 
        hasUserInfo: !!userInfo,
        userId: userInfo?.id || userInfo?.user_id 
      });
      return;
    }

    // If socket exists but not connected, clean it up first
    if (socketRef.current) {
      console.log('🧹 Cleaning up existing socket before creating new one...');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('🔌 Starting global chat socket connection...');

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                      process.env.NEXT_PUBLIC_NESTJS_URL || 
                      'http://localhost:3000';

    console.log('🌐 Global chat socket URL:', `${socketUrl}/global-chat`);

    // Create socket similar to meeting socket
    const newSocket = io(`${socketUrl}/global-chat`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
      timeout: 10000,
      autoConnect: true,
      forceNew: true, // Similar to meeting socket
      query: {
        userId, // Pass userId in query (similar to meeting socket)
      },
      auth: {
        userId, // Pass userId in auth (similar to meeting socket)
      },
    });

    socketRef.current = newSocket;

    // Connection Success
    newSocket.on('connect', () => {
      // Only update state if this is still the current socket
      if (socketRef.current !== newSocket) {
        console.log('✅ Ignoring connect event from old socket');
        return;
      }

      console.log('✅ Global chat socket connected successfully:', {
        socketId: newSocket.id,
        connected: newSocket.connected,
        transport: newSocket.io.engine?.transport?.name,
      });

      setIsConnected(true);
      setConnectionError(null);
      connectionAttempts.current = 0;
    });

    // Connection Error
    newSocket.on('connect_error', (error) => {
      // Only update state if this is still the current socket
      if (socketRef.current !== newSocket) {
        console.log('❌ Ignoring connect_error from old socket');
        return;
      }

      connectionAttempts.current++;
      
      console.error('❌ Global chat socket connection error:', {
        attempt: connectionAttempts.current,
        maxAttempts,
        error: error.message,
        type: error.name,
      });
      
      setIsConnected(false);
      setConnectionError(`Connection failed: ${error.message}`);

      if (connectionAttempts.current >= maxAttempts) {
        console.error('🛑 Max connection attempts reached for global chat, giving up');
        setConnectionError('Failed to connect to global chat after multiple attempts');
      }
    });

    // Disconnection
    newSocket.on('disconnect', (reason) => {
      // Only update state if this is still the current socket
      if (socketRef.current !== newSocket) {
        console.log('🔴 Ignoring disconnect event from old socket');
        return;
      }

      console.log('🔴 Global chat socket disconnected:', {
        reason,
        wasConnected: isConnected,
      });
      
      setIsConnected(false);

      // Don't manually reconnect on server disconnect - let Socket.IO handle it
      // Server disconnect usually means authentication failed or server error
      if (reason === 'io server disconnect') {
        console.log('⚠️ Server initiated disconnect - not reconnecting automatically');
        // Don't call newSocket.connect() - let Socket.IO's auto-reconnect handle it
        // or user can refresh the page
      } else if (reason === 'transport close' || reason === 'transport error') {
        console.log('🔄 Transport error, will auto-reconnect via Socket.IO...');
        // Socket.IO will handle reconnection automatically
      }
    });

    // Reconnection attempt
    newSocket.io.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Global chat reconnection attempt ${attempt}/${maxAttempts}`);
    });

    // Reconnection success
    newSocket.io.on('reconnect', (attemptNumber) => {
      // Only update state if this is still the current socket
      if (socketRef.current !== newSocket) {
        console.log('✅ Ignoring reconnect event from old socket');
        return;
      }

      console.log('✅ Global chat reconnected successfully after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
    });

    // Reconnection failed
    newSocket.io.on('reconnect_failed', () => {
      console.error('🛑 Global chat reconnection failed after max attempts');
      setConnectionError('Failed to reconnect to global chat');
    });

    // Handle errors
    newSocket.on('error', (error) => {
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        if (errorMessage && errorMessage.trim().length > 0) {
          console.error('❌ Global chat socket error:', error);
          setConnectionError(errorMessage);
        }
      }
    });

    setSocket(newSocket);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up global chat socket connection...');
      
      // Only cleanup if this is the current socket
      if (socketRef.current === newSocket) {
        newSocket.removeAllListeners();
        newSocket.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setConnectionError(null);
      }
    };
  }, [enabled]);

  return { socket, isConnected, connectionError };
}

