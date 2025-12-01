import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useFeatureFlag } from './use-feature-flag';

interface UseMediaSocketProps {
  meetingId: string;
  userId: string;
  isOnline: boolean;
}

interface UseMediaSocketReturn {
  mediaSocket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
}

/**
 * Hook to connect to media gateway for admin controls and media events
 */
export function useMediaSocket({
  meetingId,
  userId,
  isOnline
}: UseMediaSocketProps): UseMediaSocketReturn {
  const [mediaSocket, setMediaSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const connectionAttempts = useRef(0);
  const maxAttempts = 3;
  
  // Check if new gateway is enabled
  const useNewGateway = useFeatureFlag('use_new_gateway');

  useEffect(() => {
    // Only connect to media gateway if new gateway is enabled
    if (!useNewGateway) {
      // If old gateway, don't create separate media socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setMediaSocket(null);
        setIsConnected(false);
      }
      return;
    }

    if (!meetingId || !userId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setMediaSocket(null);
        setIsConnected(false);
      }
      return;
    }

    console.log('🔌 Starting media socket connection...', { meetingId, userId });

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                      process.env.NEXT_PUBLIC_NESTJS_URL || 
                      'http://localhost:3000';

    // Connect to /media namespace
    const newSocket = io(`${socketUrl}/media`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
      timeout: 10000,
      autoConnect: true,
      forceNew: true,
      query: {
        userId,
        meetingId,
      },
      auth: {
        userId,
        meetingId,
      },
    });

    socketRef.current = newSocket;

    // Connection Success
    newSocket.on('connect', () => {
      console.log('✅ Media socket connected successfully:', {
        socketId: newSocket.id,
        connected: newSocket.connected,
        transport: newSocket.io.engine?.transport.name,
      });

      setIsConnected(true);
      setConnectionError(null);
      connectionAttempts.current = 0;
    });

    // Connection Error
    newSocket.on('connect_error', (error) => {
      connectionAttempts.current++;
      
      console.error('❌ Media socket connection error:', {
        attempt: connectionAttempts.current,
        maxAttempts,
        error: error.message,
      });
      
      setIsConnected(false);
      setConnectionError(`Connection failed: ${error.message}`);

      if (connectionAttempts.current >= maxAttempts) {
        console.error('🛑 Max connection attempts reached for media socket');
        newSocket.disconnect();
      }
    });

    // Disconnection
    newSocket.on('disconnect', (reason) => {
      console.log('🔴 Media socket disconnected:', reason);
      setIsConnected(false);
    });

    setMediaSocket(newSocket);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up media socket connection...');
      if (newSocket.connected) {
        newSocket.disconnect();
      }
      newSocket.removeAllListeners();
      socketRef.current = null;
      setMediaSocket(null);
      setIsConnected(false);
      setConnectionError(null);
    };
  }, [meetingId, userId, useNewGateway]);

  return { mediaSocket, isConnected, connectionError };
}

