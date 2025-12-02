import { useEffect, useState, useRef } from 'react';

export interface PeerStats {
  peerId: string;
  uploadBitrate: number;
  downloadBitrate: number;
  latency: number;
  packetLoss: number;
  jitter: number;
  usingRelay: boolean;
  timestamp: number;
}

export function useWebRTCStatsWorker(
  peerConnections: Map<string, RTCPeerConnection>
) {
  const [stats, setStats] = useState<PeerStats[]>([]);
  const [workerReady, setWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const previousStatsRef = useRef<Map<string, RTCStatsReport>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize Web Worker
  useEffect(() => {
    try {
      // 🔥 FIX 3: Ensure correct worker path
      const workerPath = process.env.NODE_ENV === 'production'
        ? '/workers/webrtc-stats.worker.js'
        : '/workers/webrtc-stats.worker.js';
      
      workerRef.current = new Worker(workerPath);
      
      workerRef.current.onmessage = (e) => {
        const { type, payload } = e.data;
        
        switch (type) {
          case 'STATS_RESULT':
            setStats(prev => {
              const newStats = prev.filter(s => s.peerId !== payload.peerId);
              return [...newStats, { peerId: payload.peerId, ...payload.stats }];
            });
            break;
            
          case 'HEARTBEAT':
            // Worker is alive
            break;
            
          case 'RESET_COMPLETE':
            setWorkerReady(true);
            break;
        }
      };
      
      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        setWorkerError(error.message);
        // Fallback: Calculate stats in main thread
        setWorkerReady(false);
      };
      
      // Test worker
      workerRef.current.postMessage({ type: 'RESET' });
      
    } catch (error: any) {
      console.error('Failed to create worker:', error);
      setWorkerError(error.message);
      // Fallback to main thread calculation
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      workerRef.current?.terminate();
    };
  }, []);
  
  // Start collecting stats when worker is ready
  useEffect(() => {
    if (!workerReady || peerConnections.size === 0) return;
    
    // Calculate stats every 1 second
    intervalRef.current = setInterval(async () => {
      for (const [peerId, pc] of peerConnections.entries()) {
        try {
          const currentStats = await pc.getStats();
          const prevStats = previousStatsRef.current.get(peerId);
          
          // Convert RTCStatsReport to array
          const statsArray: any[] = [];
          currentStats.forEach((report) => {
            statsArray.push({
              id: report.id,
              type: report.type,
              timestamp: report.timestamp,
              ...Object.fromEntries(
                Object.keys(report).map(key => [key, (report as any)[key]])
              ),
            });
          });
          
          const prevStatsArray = prevStats ? (() => {
            const arr: any[] = [];
            prevStats.forEach((report) => {
              arr.push({
                id: report.id,
                type: report.type,
                timestamp: report.timestamp,
                ...Object.fromEntries(
                  Object.keys(report).map(key => [key, (report as any)[key]])
                ),
              });
            });
            return arr;
          })() : null;
          
          // Send to worker for processing
          workerRef.current?.postMessage({
            type: 'PROCESS_STATS',
            payload: {
              peerId,
              stats: statsArray,
              prevStats: prevStatsArray,
            },
          });
          
          // Store for next iteration
          previousStatsRef.current.set(peerId, currentStats);
          
        } catch (error) {
          console.error(`Failed to get stats for peer ${peerId}:`, error);
        }
      }
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [workerReady, peerConnections]);
  
  return { stats, workerReady, workerError };
}

