import { useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';

export interface MetricsState {
  uploadBitrate: number;
  downloadBitrate: number;
  latency: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  usingRelay: boolean;
  packetLoss: number;
}

export function useThrottledMetrics(
  socket: Socket | null, // Keep for backward compatibility but create own socket
  meetingId: string,
  currentMetrics: MetricsState,
  userId?: string, // Optional userId for socket auth
) {
  // Create dedicated socket for metrics namespace
  const [metricsSocket, setMetricsSocket] = useState<Socket | null>(null);
  const lastSentMetrics = useRef<MetricsState | null>(null);
  const lastSentTime = useRef<number>(0);
  const isFirstConnection = useRef<boolean>(true);
  const THROTTLE_INTERVAL = 10000; // 10 seconds
  
  // Create dedicated socket for /meeting-metrics namespace
  useEffect(() => {
    if (!meetingId) return;
    
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                      process.env.NEXT_PUBLIC_NESTJS_URL || 
                      'http://localhost:3000';
    
    const newSocket = io(`${socketUrl}/meeting-metrics`, {
      auth: {
        userId: userId || 'anonymous',
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    
    newSocket.on('connect', () => {
      console.log('✅ Metrics socket connected to /meeting-metrics');
      isFirstConnection.current = true;
      lastSentMetrics.current = null; // Force full state send
    });
    
    newSocket.on('disconnect', () => {
      console.log('❌ Metrics socket disconnected');
    });
    
    setMetricsSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
      setMetricsSocket(null);
    };
  }, [meetingId, userId]);
  
  useEffect(() => {
    if (!metricsSocket || !meetingId) return;
    
    const shouldEmit = shouldEmitMetrics(currentMetrics);
    
    if (shouldEmit) {
      emitMetrics(currentMetrics);
    }
  }, [currentMetrics, metricsSocket, meetingId]);
  
  const shouldEmitMetrics = (metrics: MetricsState): boolean => {
    // 1. First connection or reconnection - send full state
    if (isFirstConnection.current || !lastSentMetrics.current) {
      isFirstConnection.current = false;
      return true;
    }
    
    const now = Date.now();
    
    // 2. Quality changed (important!)
    if (metrics.quality !== lastSentMetrics.current.quality) {
      console.log('Quality changed:', lastSentMetrics.current.quality, '→', metrics.quality);
      return true;
    }
    
    // 3. Started using TURN relay (cost alert!)
    if (metrics.usingRelay && !lastSentMetrics.current.usingRelay) {
      console.log('Started using TURN relay');
      return true;
    }
    
    // 4. Large bandwidth change (>50%)
    const currentTotal = metrics.uploadBitrate + metrics.downloadBitrate;
    const prevTotal = lastSentMetrics.current.uploadBitrate + lastSentMetrics.current.downloadBitrate;
    
    if (prevTotal > 0) {
      const change = Math.abs(currentTotal - prevTotal);
      const changePercent = (change / prevTotal) * 100;
      
      if (changePercent > 50) {
        console.log(`Large bandwidth change: ${changePercent.toFixed(1)}%`);
        return true;
      }
    }
    
    // 5. High packet loss (>5%)
    if (metrics.packetLoss > 5 && lastSentMetrics.current.packetLoss <= 5) {
      console.log('High packet loss detected:', metrics.packetLoss);
      return true;
    }
    
    // 6. Time-based throttle (10 seconds)
    if (now - lastSentTime.current > THROTTLE_INTERVAL) {
      return true;
    }
    
    return false;
  };
  
  const emitMetrics = (metrics: MetricsState) => {
    if (!metricsSocket || !metricsSocket.connected) {
      console.warn('⚠️ Metrics socket not connected, skipping emit');
      return;
    }
    
    const isFullState = !lastSentMetrics.current;
    
    // Delta compression: Only send changed fields
    const delta: Partial<MetricsState> = {};
    
    if (isFullState) {
      // First time or reconnect: send all
      Object.assign(delta, metrics);
      console.log('📤 [METRICS] Sending full state:', delta);
    } else {
      // Send only changed fields
      if (lastSentMetrics.current) {
        for (const key in metrics) {
          const k = key as keyof MetricsState;
          if (metrics[k] !== lastSentMetrics.current[k]) {
            delta[k] = metrics[k] as any;
          }
        }
      }
      
      // If delta is empty, don't send
      if (Object.keys(delta).length === 0) {
        console.log('⏸️ [METRICS] No changes detected, skipping emit');
        return;
      }
      
      console.log('📤 [METRICS] Sending delta:', delta);
    }
    
    console.log('📤 [METRICS] Emitting to /meeting-metrics:', {
      meetingId,
      metrics: delta,
      isFullState,
      socketId: metricsSocket.id,
    });
    
    metricsSocket.emit('meeting:metrics', {
      meetingId,
      metrics: delta,
      isFullState,
      timestamp: Date.now(),
    });
    
    lastSentMetrics.current = { ...metrics };
    lastSentTime.current = Date.now();
  };
  
  return {
    lastSentTime: lastSentTime.current,
    emissionCount: lastSentMetrics.current ? 1 : 0,
  };
}

