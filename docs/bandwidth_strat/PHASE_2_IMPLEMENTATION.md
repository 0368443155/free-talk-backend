# 🎥 PHASE 2: WEBRTC MEETING BANDWIDTH MONITORING

**Timeline**: Week 2 (5 days)  
**Focus**: Frontend - Real-time Stats & Backend - Socket Gateway  
**Goal**: Production-ready WebRTC monitoring với throttling & TURN detection

---

## 📋 OVERVIEW

### What We're Building:
```
Meeting Room → Web Worker → Throttle → Socket.IO → Redis → Admin Dashboard
  (getStats)   (calculate)   (10s)      (emit)     (store)   (display)
```

### Success Criteria:
- ✅ UI maintains 60 FPS (Web Worker)
- ✅ Socket events < 10/user/minute
- ✅ TURN relay detected 100%
- ✅ Admin dashboard updates < 2s

---

## 📅 DAY-BY-DAY PLAN

### **DAY 1: Web Worker Setup** (6-8 hours)

#### Step 1.1: Create Web Worker File
**File**: `talkplatform-frontend/public/workers/webrtc-stats.worker.js`

```javascript
/**
 * WebRTC Stats Worker
 * Runs in separate thread to avoid blocking UI
 */

let previousStats = new Map();

// Listen for messages from main thread
self.onmessage = async (e) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'PROCESS_STATS':
      const result = processStats(payload.peerId, payload.stats, payload.prevStats);
      self.postMessage({ 
        type: 'STATS_RESULT', 
        payload: { peerId: payload.peerId, stats: result } 
      });
      break;
      
    case 'RESET':
      previousStats.clear();
      self.postMessage({ type: 'RESET_COMPLETE' });
      break;
  }
};

/**
 * Process WebRTC stats for a single peer
 */
function processStats(peerId, currentStatsArray, prevStatsArray) {
  const currentStats = new Map(currentStatsArray.map(s => [s.id, s]));
  const prevStats = prevStatsArray ? new Map(prevStatsArray.map(s => [s.id, s])) : null;
  
  let uploadBitrate = 0;
  let downloadBitrate = 0;
  let latency = 0;
  let packetLoss = 0;
  let jitter = 0;
  let usingRelay = false;
  
  // Process each stat report
  currentStatsArray.forEach((report) => {
    // Outbound RTP (upload)
    if (report.type === 'outbound-rtp' && report.kind === 'video') {
      if (prevStats) {
        const prevReport = prevStats.get(report.id);
        if (prevReport) {
          const bytesSent = report.bytesSent - prevReport.bytesSent;
          const timeDiff = (report.timestamp - prevReport.timestamp) / 1000;
          if (timeDiff > 0) {
            uploadBitrate += (bytesSent * 8) / timeDiff / 1000; // kbps
          }
        }
      }
    }
    
    // Inbound RTP (download)
    if (report.type === 'inbound-rtp' && report.kind === 'video') {
      if (prevStats) {
        const prevReport = prevStats.get(report.id);
        if (prevReport) {
          const bytesReceived = report.bytesReceived - prevReport.bytesReceived;
          const timeDiff = (report.timestamp - prevReport.timestamp) / 1000;
          if (timeDiff > 0) {
            downloadBitrate += (bytesReceived * 8) / timeDiff / 1000; // kbps
          }
        }
      }
      
      // Packet loss
      if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
        const totalPackets = report.packetsLost + report.packetsReceived;
        if (totalPackets > 0) {
          packetLoss = (report.packetsLost / totalPackets) * 100;
        }
      }
      
      // Jitter
      if (report.jitter !== undefined) {
        jitter = report.jitter * 1000; // Convert to ms
      }
    }
    
    // Candidate pair (latency & TURN detection)
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      // Latency (RTT)
      if (report.currentRoundTripTime !== undefined) {
        latency = report.currentRoundTripTime * 1000; // Convert to ms
      }
      
      // TURN detection
      if (report.localCandidateId && report.remoteCandidateId) {
        const localCandidate = currentStatsArray.find(
          r => r.type === 'local-candidate' && r.id === report.localCandidateId
        );
        const remoteCandidate = currentStatsArray.find(
          r => r.type === 'remote-candidate' && r.id === report.remoteCandidateId
        );
        
        // Check if using relay (TURN server)
        if (localCandidate?.candidateType === 'relay' || 
            remoteCandidate?.candidateType === 'relay') {
          usingRelay = true;
        }
      }
    }
  });
  
  return {
    uploadBitrate: Math.round(uploadBitrate),
    downloadBitrate: Math.round(downloadBitrate),
    latency: Math.round(latency),
    packetLoss: Math.round(packetLoss * 10) / 10,
    jitter: Math.round(jitter * 10) / 10,
    usingRelay,
    timestamp: Date.now(),
  };
}

// Send heartbeat every second
setInterval(() => {
  self.postMessage({ type: 'HEARTBEAT' });
}, 1000);
```

#### Step 1.2: Create Hook to Use Worker
**File**: `talkplatform-frontend/hooks/useWebRTCStatsWorker.ts`

```typescript
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
  const workerRef = useRef<Worker | null>(null);
  const previousStatsRef = useRef<Map<string, RTCStatsReport>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize Web Worker
  useEffect(() => {
    try {
      workerRef.current = new Worker('/workers/webrtc-stats.worker.js');
      
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
      };
      
      // Reset worker state
      workerRef.current.postMessage({ type: 'RESET' });
      
    } catch (error) {
      console.error('Failed to create worker:', error);
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
          
          // Send to worker for processing
          workerRef.current?.postMessage({
            type: 'PROCESS_STATS',
            payload: {
              peerId,
              stats: Array.from(currentStats.values()),
              prevStats: prevStats ? Array.from(prevStats.values()) : null,
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
  
  return { stats, workerReady };
}
```

#### Step 1.3: Test Worker
**File**: `talkplatform-frontend/hooks/__tests__/useWebRTCStatsWorker.test.ts`

```typescript
import { renderHook } from '@testing-library/react';
import { useWebRTCStatsWorker } from '../useWebRTCStatsWorker';

describe('useWebRTCStatsWorker', () => {
  it('should initialize worker', () => {
    const peerConnections = new Map();
    const { result } = renderHook(() => useWebRTCStatsWorker(peerConnections));
    
    expect(result.current.stats).toEqual([]);
    expect(result.current.workerReady).toBe(false);
  });
  
  // Add more tests...
});
```

**✅ Day 1 Checklist:**
- [ ] Web Worker created
- [ ] Hook created
- [ ] Tests written
- [ ] Worker verified in browser
- [ ] Stats calculation accurate

---

### **DAY 2: Throttling & UI Components** (6-8 hours)

#### Step 2.1: Create Throttle Hook
**File**: `talkplatform-frontend/hooks/useThrottledMetrics.ts`

```typescript
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
  const THROTTLE_INTERVAL = 10000; // 10 seconds
  
  useEffect(() => {
    if (!socket || !meetingId) return;
    
    const shouldEmit = shouldEmitMetrics(currentMetrics);
    
    if (shouldEmit) {
      emitMetrics(currentMetrics);
    }
  }, [currentMetrics, socket, meetingId]);
  
  const shouldEmitMetrics = (metrics: MetricsState): boolean => {
    const now = Date.now();
    
    // 1. First time
    if (!lastSentMetrics.current) {
      return true;
    }
    
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
      // First time: send all
      Object.assign(delta, metrics);
    } else {
      // Send only changed fields
      for (const key in metrics) {
        const k = key as keyof MetricsState;
        if (metrics[k] !== lastSentMetrics.current[k]) {
          delta[k] = metrics[k] as any;
        }
      }
    }
    
    console.log('Emitting metrics:', delta);
    
    socket.emit('meeting:metrics', {
      meetingId,
      metrics: delta,
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
```

#### Step 2.2: Create Connection Quality Indicator
**File**: `talkplatform-frontend/components/meeting-room/ConnectionQualityIndicator.tsx`

```typescript
'use client';

import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
  packetLoss: number;
  usingRelay?: boolean;
}

const qualityConfig = {
  excellent: { 
    color: 'bg-green-500', 
    icon: Wifi, 
    bars: 4, 
    text: 'Excellent',
    textColor: 'text-green-900',
  },
  good: { 
    color: 'bg-blue-500', 
    icon: Wifi, 
    bars: 3, 
    text: 'Good',
    textColor: 'text-blue-900',
  },
  fair: { 
    color: 'bg-yellow-500', 
    icon: Wifi, 
    bars: 2, 
    text: 'Fair',
    textColor: 'text-yellow-900',
  },
  poor: { 
    color: 'bg-red-500', 
    icon: WifiOff, 
    bars: 1, 
    text: 'Poor',
    textColor: 'text-red-900',
  },
};

export function ConnectionQualityIndicator({ quality, latency, packetLoss, usingRelay }: Props) {
  const config = qualityConfig[quality];
  const Icon = config.icon;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="fixed top-4 right-4 z-50">
            <Badge className={`${config.color} text-white flex items-center gap-2 px-3 py-2 shadow-lg`}>
              <Icon className="w-4 h-4" />
              
              {/* Signal bars */}
              <div className="flex gap-0.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-sm transition-all ${
                      i < config.bars ? 'bg-white h-3' : 'bg-white/30 h-2'
                    }`}
                  />
                ))}
              </div>
              
              <span className="text-xs font-medium">{config.text}</span>
              
              {/* TURN warning */}
              {usingRelay && (
                <AlertTriangle className="w-4 h-4 text-orange-300" />
              )}
            </Badge>
          </div>
        </TooltipTrigger>
        
        <TooltipContent side="bottom" className="bg-black/90 text-white border-white/20">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Latency:</span>
              <span className="font-mono">{latency}ms</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Packet Loss:</span>
              <span className="font-mono">{packetLoss.toFixed(1)}%</span>
            </div>
            {usingRelay && (
              <div className="flex items-center gap-2 text-orange-300 pt-1 border-t border-white/20">
                <AlertTriangle className="w-3 h-3" />
                <span>Using relay server</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

#### Step 2.3: Create Bandwidth Display
**File**: `talkplatform-frontend/components/meeting-room/BandwidthDisplay.tsx`

```typescript
'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PeerStats } from '@/hooks/useWebRTCStatsWorker';

interface Props {
  upload: number;
  download: number;
  latency: number;
  peerStats: PeerStats[];
}

export function BandwidthDisplay({ upload, download, latency, peerStats }: Props) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card className="fixed bottom-4 right-4 z-50 bg-black/80 text-white border-white/20 backdrop-blur-sm">
      <div 
        className="p-3 cursor-pointer flex items-center gap-3 hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Activity className="w-4 h-4 text-blue-400" />
        
        <div className="flex items-center gap-2">
          <ArrowUp className="w-4 h-4 text-green-400" />
          <span className="text-sm font-mono tabular-nums">{formatBitrate(upload)}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <ArrowDown className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-mono tabular-nums">{formatBitrate(download)}</span>
        </div>
        
        <div className="text-xs text-gray-400 font-mono tabular-nums">
          {latency}ms
        </div>
        
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
      
      {expanded && peerStats.length > 0 && (
        <div className="border-t border-white/20 p-3 space-y-2 max-h-64 overflow-y-auto">
          <div className="text-xs font-semibold mb-2 text-gray-300">Per-Peer Stats:</div>
          {peerStats.map((stat) => (
            <div key={stat.peerId} className="text-xs flex justify-between items-center py-1">
              <span className="text-gray-400 truncate max-w-[100px]" title={stat.peerId}>
                {stat.peerId.slice(0, 8)}...
              </span>
              <div className="flex gap-3 font-mono tabular-nums">
                <span className="text-green-400">↑ {formatBitrate(stat.uploadBitrate)}</span>
                <span className="text-blue-400">↓ {formatBitrate(stat.downloadBitrate)}</span>
                <span className="text-gray-400">{stat.latency}ms</span>
                {stat.usingRelay && (
                  <span className="text-orange-400 text-[10px]">TURN</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function formatBitrate(kbps: number): string {
  if (kbps < 1000) return `${kbps} kbps`;
  return `${(kbps / 1000).toFixed(1)} Mbps`;
}
```

**✅ Day 2 Checklist:**
- [ ] Throttle hook created
- [ ] Connection indicator created
- [ ] Bandwidth display created
- [ ] Components tested
- [ ] UI responsive

---

### **DAY 3: Meeting Room Integration** (6-8 hours)

#### Step 3.1: Update Meeting Room Component
**File**: `talkplatform-frontend/components/meeting-room/MeetingRoom.tsx`

```typescript
'use client';

import { useMemo } from 'react';
import { useWebRTCStatsWorker } from '@/hooks/useWebRTCStatsWorker';
import { useThrottledMetrics } from '@/hooks/useThrottledMetrics';
import { ConnectionQualityIndicator } from './ConnectionQualityIndicator';
import { BandwidthDisplay } from './BandwidthDisplay';
import { useSocket } from '@/hooks/useSocket';

interface MeetingRoomProps {
  meetingId: string;
  // ... other props
}

export function MeetingRoom({ meetingId }: MeetingRoomProps) {
  // Existing hooks
  const { peerConnections } = usePeerConnections(); // Your existing hook
  const socket = useSocket();
  
  // NEW: WebRTC stats collection
  const { stats, workerReady } = useWebRTCStatsWorker(peerConnections);
  
  // Calculate aggregated metrics
  const aggregatedMetrics = useMemo(() => {
    const totalUpload = stats.reduce((sum, s) => sum + s.uploadBitrate, 0);
    const totalDownload = stats.reduce((sum, s) => sum + s.downloadBitrate, 0);
    const avgLatency = stats.length > 0 
      ? stats.reduce((sum, s) => sum + s.latency, 0) / stats.length 
      : 0;
    const avgPacketLoss = stats.length > 0
      ? stats.reduce((sum, s) => sum + s.packetLoss, 0) / stats.length
      : 0;
    const usingRelay = stats.some(s => s.usingRelay);
    
    // Determine connection quality
    const quality = getConnectionQuality(avgLatency, avgPacketLoss);
    
    return {
      uploadBitrate: totalUpload,
      downloadBitrate: totalDownload,
      latency: avgLatency,
      packetLoss: avgPacketLoss,
      quality,
      usingRelay,
    };
  }, [stats]);
  
  // NEW: Throttled metrics emission
  useThrottledMetrics(socket, meetingId, aggregatedMetrics);
  
  return (
    <div className="meeting-room relative">
      {/* Existing meeting UI */}
      <div className="video-grid">
        {/* Your existing video grid */}
      </div>
      
      {/* NEW: Connection Quality Indicator */}
      {workerReady && (
        <ConnectionQualityIndicator 
          quality={aggregatedMetrics.quality}
          latency={aggregatedMetrics.latency}
          packetLoss={aggregatedMetrics.packetLoss}
          usingRelay={aggregatedMetrics.usingRelay}
        />
      )}
      
      {/* NEW: Bandwidth Display */}
      {workerReady && stats.length > 0 && (
        <BandwidthDisplay
          upload={aggregatedMetrics.uploadBitrate}
          download={aggregatedMetrics.downloadBitrate}
          latency={aggregatedMetrics.latency}
          peerStats={stats}
        />
      )}
    </div>
  );
}

function getConnectionQuality(
  latency: number, 
  packetLoss: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (latency < 100 && packetLoss < 1) return 'excellent';
  if (latency < 200 && packetLoss < 3) return 'good';
  if (latency < 400 && packetLoss < 5) return 'fair';
  return 'poor';
}
```

**✅ Day 3 Checklist:**
- [ ] Meeting room updated
- [ ] Stats displayed correctly
- [ ] Throttling working
- [ ] No UI lag (60 FPS)
- [ ] TURN detection working

---

### **DAY 4: Backend Socket Gateway** (6-8 hours)

#### Step 4.1: Create Meeting Metrics Gateway
**File**: `talkplatform-backend/src/gateways/meeting-metrics.gateway.ts`

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

interface UserMetrics {
  uploadBitrate?: number;
  downloadBitrate?: number;
  latency?: number;
  quality?: string;
  usingRelay?: boolean;
  packetLoss?: number;
}

@WebSocketGateway({
  namespace: '/meeting-metrics',
  cors: { origin: '*' },
})
export class MeetingMetricsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private readonly logger = new Logger(MeetingMetricsGateway.name);
  private lastBroadcast = new Map<string, number>();
  private readonly BROADCAST_THROTTLE = 2000; // 2 seconds
  
  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}
  
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }
  
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
  
  @SubscribeMessage('meeting:metrics')
  async handleMetrics(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      meetingId: string;
      metrics: Partial<UserMetrics>;
      timestamp: number;
    },
  ) {
    const { meetingId, metrics } = data;
    const userId = client.data.userId || client.id;
    
    try {
      // 1. Merge with existing metrics in Redis (delta update)
      const existingMetrics = await this.getExistingMetrics(meetingId, userId);
      const mergedMetrics = { ...existingMetrics, ...metrics };
      
      // 2. Store in Redis (TTL: 5 minutes)
      await this.redis.set(
        `meeting:${meetingId}:user:${userId}:metrics`,
        JSON.stringify(mergedMetrics),
        'EX',
        300,
      );
      
      // 3. Check for alerts (immediate)
      await this.checkAlerts(meetingId, userId, mergedMetrics);
      
      // 4. Throttled broadcast to admin (2s interval)
      await this.throttledBroadcast(meetingId, userId, mergedMetrics);
      
    } catch (error) {
      this.logger.error('Failed to handle metrics:', error);
    }
  }
  
  @SubscribeMessage('admin:subscribe')
  handleAdminSubscribe(@ConnectedSocket() client: Socket) {
    client.join('admin-dashboard');
    this.logger.log(`Admin subscribed: ${client.id}`);
  }
  
  @SubscribeMessage('admin:unsubscribe')
  handleAdminUnsubscribe(@ConnectedSocket() client: Socket) {
    client.leave('admin-dashboard');
    this.logger.log(`Admin unsubscribed: ${client.id}`);
  }
  
  private async getExistingMetrics(meetingId: string, userId: string): Promise<UserMetrics> {
    const data = await this.redis.get(`meeting:${meetingId}:user:${userId}:metrics`);
    return data ? JSON.parse(data) : {};
  }
  
  private async throttledBroadcast(
    meetingId: string,
    userId: string,
    metrics: UserMetrics,
  ) {
    const key = `${meetingId}:${userId}`;
    const now = Date.now();
    const lastTime = this.lastBroadcast.get(key) || 0;
    
    // Only broadcast if 2 seconds passed
    if (now - lastTime > this.BROADCAST_THROTTLE) {
      this.server.to('admin-dashboard').emit('meeting:metrics:update', {
        meetingId,
        userId,
        metrics,
        timestamp: now,
      });
      
      this.lastBroadcast.set(key, now);
    }
  }
  
  private async checkAlerts(meetingId: string, userId: string, metrics: UserMetrics) {
    const alerts = [];
    
    // High latency
    if (metrics.latency && metrics.latency > 300) {
      alerts.push({
        type: 'high-latency',
        severity: 'warning',
        message: `User ${userId} has high latency: ${metrics.latency}ms`,
      });
    }
    
    // High packet loss
    if (metrics.packetLoss && metrics.packetLoss > 5) {
      alerts.push({
        type: 'packet-loss',
        severity: 'warning',
        message: `User ${userId} has high packet loss: ${metrics.packetLoss}%`,
      });
    }
    
    // TURN relay (cost!)
    if (metrics.usingRelay) {
      alerts.push({
        type: 'using-turn',
        severity: 'info',
        message: `User ${userId} is using TURN relay (bandwidth cost)`,
        cost: true,
      });
    }
    
    // Poor connection
    if (metrics.quality === 'poor') {
      alerts.push({
        type: 'poor-connection',
        severity: 'critical',
        message: `User ${userId} has poor connection quality`,
      });
    }
    
    if (alerts.length > 0) {
      // Immediate broadcast (no throttle for alerts)
      this.server.to('admin-dashboard').emit('meeting:alerts', {
        meetingId,
        userId,
        alerts,
        timestamp: Date.now(),
      });
    }
  }
}
```

#### Step 4.2: Register Gateway
**File**: `talkplatform-backend/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MeetingMetricsGateway } from './gateways/meeting-metrics.gateway';

@Module({
  // ... existing imports
  providers: [
    // ... existing providers
    MeetingMetricsGateway,
  ],
})
export class AppModule {}
```

**✅ Day 4 Checklist:**
- [ ] Gateway created
- [ ] Socket events working
- [ ] Redis storage working
- [ ] Alerts triggering
- [ ] Throttling verified

---

### **DAY 5: Testing & Optimization** (6-8 hours)

#### Step 5.1: Load Testing Script
**File**: `talkplatform-frontend/scripts/test-webrtc-metrics.ts`

```typescript
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000/meeting-metrics';
const NUM_USERS = 10;
const MEETING_ID = 'test-meeting-123';

async function simulateUser(userId: string) {
  const socket = io(SOCKET_URL);
  
  socket.on('connect', () => {
    console.log(`User ${userId} connected`);
    
    // Simulate metrics every 10 seconds
    setInterval(() => {
      const metrics = {
        uploadBitrate: Math.random() * 1000,
        downloadBitrate: Math.random() * 2000,
        latency: Math.random() * 200,
        quality: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)],
        usingRelay: Math.random() > 0.8, // 20% chance
        packetLoss: Math.random() * 5,
      };
      
      socket.emit('meeting:metrics', {
        meetingId: MEETING_ID,
        metrics,
        timestamp: Date.now(),
      });
      
      console.log(`User ${userId} sent metrics:`, metrics.quality);
    }, 10000);
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected`);
  });
}

// Simulate multiple users
for (let i = 0; i < NUM_USERS; i++) {
  simulateUser(`user-${i}`);
}

console.log(`Simulating ${NUM_USERS} users in meeting ${MEETING_ID}`);
```

Run test:
```bash
ts-node scripts/test-webrtc-metrics.ts
```

#### Step 5.2: Performance Monitoring
**File**: `talkplatform-frontend/hooks/usePerformanceMonitor.ts`

```typescript
import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(enabled: boolean = true) {
  const fpsRef = useRef<number>(60);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  
  useEffect(() => {
    if (!enabled) return;
    
    let animationFrameId: number;
    
    const measureFPS = () => {
      const now = performance.now();
      frameCountRef.current++;
      
      if (now >= lastTimeRef.current + 1000) {
        fpsRef.current = Math.round(
          (frameCountRef.current * 1000) / (now - lastTimeRef.current)
        );
        frameCountRef.current = 0;
        lastTimeRef.current = now;
        
        // Log if FPS drops below 50
        if (fpsRef.current < 50) {
          console.warn(`Low FPS detected: ${fpsRef.current}`);
        }
      }
      
      animationFrameId = requestAnimationFrame(measureFPS);
    };
    
    animationFrameId = requestAnimationFrame(measureFPS);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled]);
  
  return fpsRef.current;
}
```

Use in Meeting Room:
```typescript
const fps = usePerformanceMonitor(true);
console.log('Current FPS:', fps);
```

**✅ Day 5 Checklist:**
- [ ] Load test passed (10+ users)
- [ ] FPS maintained at 60
- [ ] Socket events < 10/user/min
- [ ] TURN detection 100% accurate
- [ ] Admin dashboard receiving updates
- [ ] No memory leaks

---

## 📊 PHASE 2 SUCCESS METRICS

### Performance:
- ✅ UI FPS: **60** (no drops)
- ✅ Socket events: **< 10/user/minute**
- ✅ Worker CPU: **< 5%**
- ✅ Memory usage: **< 50MB**

### Accuracy:
- ✅ Bandwidth accuracy: **±5%**
- ✅ Latency accuracy: **±5ms**
- ✅ TURN detection: **100%**

### Reliability:
- ✅ Worker uptime: **100%**
- ✅ Socket connection: **> 99%**
- ✅ Metrics delivery: **> 95%**

---

## 🚨 TROUBLESHOOTING

### Issue 1: Worker Not Starting
**Symptom**: Stats not updating  
**Cause**: Worker file not found  
**Solution**:
```bash
# Verify worker file exists
ls public/workers/webrtc-stats.worker.js

# Check browser console for errors
# Ensure worker is served correctly
```

### Issue 2: High Socket Traffic
**Symptom**: > 10 events/user/min  
**Cause**: Throttling not working  
**Solution**:
```typescript
// Check throttle interval
const THROTTLE_INTERVAL = 10000; // Should be 10s

// Verify shouldEmitMetrics logic
console.log('Should emit:', shouldEmitMetrics(metrics));
```

### Issue 3: TURN Not Detected
**Symptom**: usingRelay always false  
**Cause**: Candidate type not checked  
**Solution**:
```javascript
// In worker, verify candidate type check
if (localCandidate?.candidateType === 'relay') {
  usingRelay = true;
}
```

---

## 📝 DEPLOYMENT CHECKLIST

### Pre-deployment:
- [ ] All tests passing
- [ ] Worker file in public/workers/
- [ ] Socket.IO configured
- [ ] Redis configured
- [ ] Environment variables set

### Deployment:
- [ ] Deploy frontend
- [ ] Deploy backend gateway
- [ ] Verify worker loads
- [ ] Test socket connection
- [ ] Monitor for 1 hour

### Post-deployment:
- [ ] Check FPS in production
- [ ] Verify socket events
- [ ] Check TURN detection
- [ ] Monitor Redis memory
- [ ] Review logs

---

## 🎯 NEXT PHASE

**Phase 3: Admin Dashboard & Analytics**
- Real-time meeting monitor
- TURN cost tracking
- Historical charts
- Export functionality

**Estimated Start**: After Phase 2 stable (24 hours)

---

**Status**: ✅ **READY TO START DAY 1**  
**First Task**: Create Web Worker file

Bạn sẵn sàng bắt đầu Phase 2 chưa? 🚀
