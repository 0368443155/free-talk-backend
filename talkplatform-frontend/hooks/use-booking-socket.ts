import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseBookingSocketProps {
  bookingId: string;
  userId: string;
  isOnline: boolean;
}

export function useBookingSocket({ bookingId, userId, isOnline }: UseBookingSocketProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isOnline || !bookingId || !userId) {
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002';
    
    const newSocket = io(socketUrl, {
      query: { userId, bookingId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('✅ [BookingSocket] Connected to server');
      setIsConnected(true);
      
      // Join booking room
      newSocket.emit('booking:join', { bookingId, userId });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ [BookingSocket] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ [BookingSocket] Connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('booking:join-error', (data: { message: string }) => {
      console.error('❌ [BookingSocket] Join error:', data.message);
    });

    setSocket(newSocket);

    return () => {
      // Only disconnect if this is still the current socket
      if (socketRef.current === newSocket && newSocket.connected) {
        console.log('🧹 [BookingSocket] Cleaning up socket');
        newSocket.emit('booking:leave', { bookingId, userId });
        newSocket.disconnect();
      }
      socketRef.current = null;
    };
  }, [bookingId, userId, isOnline]);

  return { socket, isConnected };
}

