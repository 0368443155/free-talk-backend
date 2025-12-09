// File: hooks/use-meeting-socket.ts
// Fixed version with better error handling

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useFeatureFlag } from './use-feature-flag';

interface UseMeetingSocketProps {
  meetingId: string;
  userId: string;
  isOnline: boolean;
}

interface UseMeetingSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
}

export function useMeetingSocket({
  meetingId,
  userId,
  isOnline
}: UseMeetingSocketProps): UseMeetingSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const connectionAttempts = useRef(0);
  const maxAttempts = 3;
  
  // Check if new gateway is enabled
  const useNewGateway = useFeatureFlag('use_new_gateway');

  useEffect(() => {
    if (!meetingId || !userId) {
      console.log('⏸️ Socket connection paused - missing data:', { meetingId, userId });

      if (socketRef.current) {
        console.log('🔌 Disconnecting previous socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    console.log('🔌 Starting socket connection...', { meetingId, userId });

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                      process.env.NEXT_PUBLIC_NESTJS_URL || 
                      'http://localhost:3000';

    console.log('🌐 Socket URL:', socketUrl);

    const newSocket = io(socketUrl, {
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
      console.log('✅ Socket connected successfully:', {
        socketId: newSocket.id,
        connected: newSocket.connected,
        transport: newSocket.io.engine?.transport.name,
      });

      setIsConnected(true);
      setConnectionError(null);
      connectionAttempts.current = 0;

      // 🔥 FIX: Only join if user is online (participant exists)
      // Socket join should happen after REST API join
      if (isOnline) {
        console.log('📡 Joining meeting via socket...');
        // Support both old and new events
        if (useNewGateway) {
          newSocket.emit('room:join', { roomId: meetingId, userId });
        } else {
          newSocket.emit('meeting:join', { meetingId, userId });
        }
      } else {
        console.log('⏸️ Skipping socket join - user not a participant yet (isOnline:', isOnline, ')');
      }
    });

    // Connection Error
    newSocket.on('connect_error', (error) => {
      connectionAttempts.current++;
      
      console.error('❌ Socket connection error:', {
        attempt: connectionAttempts.current,
        maxAttempts,
        error: error.message,
        type: error.name,
      });
      
      setIsConnected(false);
      setConnectionError(`Connection failed: ${error.message}`);

      if (connectionAttempts.current >= maxAttempts) {
        console.error('🛑 Max connection attempts reached, giving up');
        newSocket.disconnect();
      }
    });

    // Disconnection
    newSocket.on('disconnect', (reason) => {
      console.log('🔴 Socket disconnected:', {
        reason,
        wasConnected: isConnected,
      });
      
      setIsConnected(false);

      if (reason === 'io server disconnect') {
        console.log('🔄 Server initiated disconnect, reconnecting...');
        newSocket.connect();
      } else if (reason === 'transport close' || reason === 'transport error') {
        console.log('🔄 Transport error, will auto-reconnect...');
      }
    });

    // Reconnection attempt
    newSocket.io.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}/${maxAttempts}`);
    });

    // Reconnection success
    newSocket.io.on('reconnect', (attemptNumber) => {
      console.log('✅ Reconnected successfully after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);

      // 🔥 FIX: Only rejoin if user is online (participant exists)
      if (isOnline) {
        console.log('📡 Rejoining meeting via socket after reconnect...');
        // Support both old and new events
        if (useNewGateway) {
          newSocket.emit('room:join', { roomId: meetingId, userId });
        } else {
          newSocket.emit('meeting:join', { meetingId, userId });
        }
      } else {
        console.log('⏸️ Skipping socket rejoin - user not a participant yet');
      }
    });

    // Reconnection failed
    newSocket.io.on('reconnect_failed', () => {
      console.error('🛑 Reconnection failed after max attempts');
      setConnectionError('Failed to reconnect to server');
    });

    // 🔥 FIX: Handle meeting join errors separately (not socket errors)
    newSocket.on('meeting:join-error', (data) => {
      console.warn('⚠️ Meeting join error:', data);
      // Don't treat this as a connection error, just log it
      // The user might not be a participant yet, which is expected
    });

    // 🔥 FIX: Better error handling - completely ignore empty error objects and expected errors
    newSocket.on('error', (error) => {
      // Check if it's an expected meeting join error
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        if (errorMessage && (
          errorMessage.includes('Failed to join meeting') ||
          errorMessage.includes('Not authorized to join')
        )) {
          // This is expected - user might not be participant yet
          // Don't log as error, just as info
          return;
        }
      }

      // Check if error is truly empty (no meaningful properties)
      if (!error) {
        return; // Ignore null/undefined
      }

      // Get own properties only (exclude prototype/constructor)
      const ownKeys = Object.keys(error);
      const hasOwnProps = ownKeys.length > 0;
      
      // Check if any property has meaningful value
      const hasMeaningfulValue = ownKeys.some(key => {
        const value = error[key];
        if (value === null || value === undefined || value === '') {
          return false;
        }
        // Check if string is not empty after trim
        if (typeof value === 'string' && value.trim().length === 0) {
          return false;
        }
        // Check if object/array is not empty
        if (typeof value === 'object' && Object.keys(value).length === 0) {
          return false;
        }
        return true;
      });

      // Only log if error has meaningful content
      if (hasOwnProps && hasMeaningfulValue) {
        console.error('❌ Socket error:', error);
        
        // Only set connection error for serious errors
        if (error.type === 'TransportError' || error.message?.includes('connection')) {
          setConnectionError(error.message || 'Socket error occurred');
        }
      }
      // Completely ignore empty error objects to reduce log noise
    });

    // Meeting-specific events
    newSocket.on('meeting:joined', (data) => {
      console.log('✅ Successfully joined meeting:', data);
    });

    newSocket.on('meeting:user-joined', (data) => {
      console.log('👤 User joined:', data.userName);
    });

    newSocket.on('meeting:user-left', (data) => {
      console.log('👋 User left:', data.userName);
    });

    setSocket(newSocket);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket connection...');
      
      // Only cleanup if this is still the current socket
      // This prevents cleanup in React Strict Mode double invocation
      if (socketRef.current === newSocket) {
        if (newSocket.connected) {
          console.log('📤 Emitting leave before disconnect');
          // Support both old and new events
          if (useNewGateway) {
            newSocket.emit('room:leave', { roomId: meetingId, userId });
          } else {
            newSocket.emit('meeting:leave', { meetingId, userId });
          }
        }
        
        newSocket.removeAllListeners();
        // Only disconnect if actually connected (avoid "WebSocket is closed before connection" error)
        if (newSocket.connected) {
          newSocket.disconnect();
        }
        
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setConnectionError(null);
      }
    };
  }, [meetingId, userId]); // Remove isOnline from dependencies

  // 🔥 FIX: Separate effect to handle socket join when isOnline changes
  useEffect(() => {
    if (!socket || !isConnected || !isOnline || !meetingId || !userId) {
      return;
    }

    // Join meeting via socket when user becomes online
    // The server will handle duplicate joins gracefully
    console.log('📡 Triggering socket join (isOnline changed to true)...');
    // Support both old and new events
    if (useNewGateway) {
      socket.emit('room:join', { roomId: meetingId, userId });
    } else {
      socket.emit('meeting:join', { meetingId, userId });
    }
  }, [socket, isConnected, isOnline, meetingId, userId, useNewGateway]);

  return { socket, isConnected, connectionError };
}