import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

export interface MetricsState {
  uploadBitrate: number;
  downloadBitrate: number;
  latency: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  usingRelay: boolean;
  packetLoss: number;
}

export function useThrottledMetrics(
  socket: Socket | null,
  meetingId: string,
  currentMetrics: MetricsState,
) {
  const lastSentMetrics = useRef<MetricsState | null>(null);
  const lastSentTime = useRef<number>(0);
  const isFirstConnection = useRef<boolean>(true);
  const THROTTLE_INTERVAL = 10000; // 10 seconds
  
  // 🔥 FIX 4: Reset state on socket reconnect
  useEffect(() => {
    if (!socket) return;
    
    const handleConnect = () => {
      console.log('Socket connected, sending full state');
      isFirstConnection.current = true;
      lastSentMetrics.current = null; // Force full state send
    };
    
    const handleDisconnect = () => {
      console.log('Socket disconnected');
    };
    
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);
  
  useEffect(() => {
    if (!socket || !meetingId) return;
    
    const shouldEmit = shouldEmitMetrics(currentMetrics);
    
    if (shouldEmit) {
      emitMetrics(currentMetrics);
    }
  }, [currentMetrics, socket, meetingId]);
  
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
    if (!socket) return;
    
    // Delta compression: Only send changed fields
    const delta: Partial<MetricsState> = {};
    
    if (!lastSentMetrics.current) {
      // First time or reconnect: send all
      Object.assign(delta, metrics);
      console.log('Sending full state:', delta);
    } else {
      // Send only changed fields
      for (const key in metrics) {
        const k = key as keyof MetricsState;
        if (metrics[k] !== lastSentMetrics.current[k]) {
          delta[k] = metrics[k] as any;
        }
      }
    }
    
    socket.emit('meeting:metrics', {
      meetingId,
      metrics: delta,
      isFullState: !lastSentMetrics.current, // 🔥 Flag for server
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

