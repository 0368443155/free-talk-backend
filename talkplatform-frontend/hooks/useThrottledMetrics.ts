import { useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';

export interface MetricsState {
  uploadBitrate: number;
  downloadBitrate: number;
  latency: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  usingRelay: boolean;
  packetLoss: number;
  // YouTube metrics (optional)
  youtube?: {
    downloadBitrate: number;
    quality: string;
    totalBytesDownloaded: number;
    bufferingEvents: number;
  };
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
    if (!metricsSocket || !meetingId) {
      console.warn('⚠️ [METRICS] Cannot emit - missing socket or meetingId', {
        hasSocket: !!metricsSocket,
        socketConnected: metricsSocket?.connected,
        meetingId,
      });
      return;
    }
    
    const shouldEmit = shouldEmitMetrics(currentMetrics);
    
    if (shouldEmit) {
      emitMetrics(currentMetrics);
    } else {
      console.log('⏸️ [METRICS] Skipping emit - throttled or no changes');
    }
  }, [currentMetrics, metricsSocket, meetingId]);
  
  const shouldEmitMetrics = (metrics: MetricsState): boolean => {
    // 1. First connection or reconnection - send full state
    if (isFirstConnection.current || !lastSentMetrics.current) {
      isFirstConnection.current = false;
      console.log('✅ [METRICS] First emit - sending full state');
      return true;
    }
    
    const now = Date.now();
    
    // 2. YouTube metrics changed or started (important!)
    if (metrics.youtube) {
      const prevYouTube = lastSentMetrics.current.youtube;
      if (!prevYouTube) {
        console.log('📺 [METRICS] YouTube started - emitting');
        return true;
      }
      if (metrics.youtube.downloadBitrate !== prevYouTube.downloadBitrate) {
        console.log('📺 [METRICS] YouTube bitrate changed:', prevYouTube.downloadBitrate, '→', metrics.youtube.downloadBitrate);
        return true;
      }
      if (metrics.youtube.quality !== prevYouTube.quality) {
        console.log('📺 [METRICS] YouTube quality changed:', prevYouTube.quality, '→', metrics.youtube.quality);
        return true;
      }
    }
    
    // 3. Quality changed (important!)
    if (metrics.quality !== lastSentMetrics.current.quality) {
      console.log('Quality changed:', lastSentMetrics.current.quality, '→', metrics.quality);
      return true;
    }
    
    // 4. Started using TURN relay (cost alert!)
    if (metrics.usingRelay && !lastSentMetrics.current.usingRelay) {
      console.log('Started using TURN relay');
      return true;
    }
    
    // 5. Large bandwidth change (>50%)
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
    
    // 6. High packet loss (>5%)
    if (metrics.packetLoss > 5 && lastSentMetrics.current.packetLoss <= 5) {
      console.log('High packet loss detected:', metrics.packetLoss);
      return true;
    }
    
    // 7. YouTube active - emit more frequently (every 3 seconds)
    if (metrics.youtube && metrics.youtube.downloadBitrate > 0) {
      const YOUTUBE_THROTTLE = 3000; // 3 seconds for YouTube
      if (now - lastSentTime.current > YOUTUBE_THROTTLE) {
        console.log('📺 [METRICS] YouTube active - time-based emit (3s interval)');
        return true;
      }
    }
    
    // 8. Time-based throttle (10 seconds) for non-YouTube
    if (now - lastSentTime.current > THROTTLE_INTERVAL) {
      console.log('⏰ [METRICS] Time-based emit (10s interval)');
      return true;
    }
    
    return false;
  };
  
  const emitMetrics = (metrics: MetricsState) => {
    if (!metricsSocket || !metricsSocket.connected) {
      console.warn('⚠️ Metrics socket not connected, skipping emit');
      return;
    }
    
    // Delta compression: Only send changed fields
    const delta: Partial<MetricsState> = {};
    
    if (!lastSentMetrics.current) {
      // First time or reconnect: send all
      Object.assign(delta, metrics);
      console.log('📤 [METRICS] Sending full state:', delta);
    } else {
      // Send only changed fields
      for (const key in metrics) {
        const k = key as keyof MetricsState;
        if (metrics[k] !== lastSentMetrics.current[k]) {
          delta[k] = metrics[k] as any;
        }
      }
    }
    
    console.log('📤 [METRICS] Emitting to /meeting-metrics:', {
      meetingId,
      metrics: delta,
      socketId: metricsSocket.id,
    });
    
    metricsSocket.emit('meeting:metrics', {
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

