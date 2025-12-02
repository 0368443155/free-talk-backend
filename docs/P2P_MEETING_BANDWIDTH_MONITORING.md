# 🎥 P2P MEETING ROOM - BANDWIDTH & LATENCY MONITORING

**Date**: 2025-12-02  
**Version**: 2.0  
**Focus**: Meeting Room P2P với Real-time Metrics

---

## 🎯 MỤC TIÊU

### User Experience:
- ✅ Hiển thị **bandwidth** thực tế của chính họ
- ✅ Hiển thị **latency** (ping) đến các peer khác
- ✅ Hiển thị **connection quality** (good/fair/poor)
- ✅ Cảnh báo khi **connection yếu**

### Admin Dashboard:
- ✅ Theo dõi **tất cả meetings** đang diễn ra
- ✅ Xem **bandwidth** của từng user trong meeting
- ✅ Xem **connection quality** của meeting
- ✅ Nhận **alerts** khi có vấn đề

### Technical:
- ✅ Sử dụng **WebRTC Stats API** để đo bandwidth/latency
- ✅ Sử dụng **Socket.IO** để broadcast metrics
- ✅ **Không động LiveKit** - Chỉ sửa Meeting Room
- ✅ Giữ nguyên **tất cả features** hiện tại

---

## 🏗️ KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────────┐
│                    Meeting Room (P2P)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              WebRTC Peer Connections                  │   │
│  │  User A ←──────────────────────────────→ User B      │   │
│  │    ↓                                         ↓        │   │
│  │  Stats API                              Stats API     │   │
│  │    ↓                                         ↓        │   │
│  │  Metrics                                 Metrics      │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Metrics Collection Service                  │   │
│  │  • Calculate bandwidth (upload/download)             │   │
│  │  • Calculate latency (RTT)                           │   │
│  │  • Calculate packet loss                             │   │
│  │  • Determine connection quality                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Socket.IO Gateway                         │
│  • Emit metrics to admin dashboard                          │
│  • Broadcast to other participants                          │
│  • Store in Redis (temporary)                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Admin Dashboard                            │
│  • Real-time meeting list                                   │
│  • Per-user bandwidth/latency                               │
│  • Connection quality indicators                            │
│  • Alerts & notifications                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 METRICS TO COLLECT

### 1. WebRTC Stats (Per Peer Connection)

```typescript
interface WebRTCStats {
  // Bandwidth
  bytesSent: number;           // Total bytes sent
  bytesReceived: number;       // Total bytes received
  
  // Bitrate (calculated)
  uploadBitrate: number;       // kbps
  downloadBitrate: number;     // kbps
  
  // Latency
  currentRoundTripTime: number; // ms (RTT)
  
  // Quality
  packetsLost: number;
  packetsSent: number;
  packetsReceived: number;
  packetLossRate: number;      // %
  
  // Jitter
  jitter: number;              // ms
  
  // Connection
  connectionState: string;     // 'connected', 'disconnected', etc.
  iceConnectionState: string;
}
```

### 2. Aggregated User Metrics

```typescript
interface UserMetrics {
  userId: string;
  username: string;
  meetingId: string;
  
  // Bandwidth
  totalUpload: number;         // kbps (sum of all peer connections)
  totalDownload: number;       // kbps
  
  // Latency (average to all peers)
  avgLatency: number;          // ms
  minLatency: number;          // ms
  maxLatency: number;          // ms
  
  // Quality
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  packetLossRate: number;      // %
  
  // Timestamp
  timestamp: Date;
}
```

### 3. Meeting Metrics

```typescript
interface MeetingMetrics {
  meetingId: string;
  meetingName: string;
  startTime: Date;
  
  // Participants
  totalParticipants: number;
  activeParticipants: number;
  
  // Bandwidth (sum of all users)
  totalBandwidth: number;      // kbps
  avgBandwidthPerUser: number; // kbps
  
  // Quality
  avgConnectionQuality: number; // 0-100
  usersWithIssues: number;
  
  // Alerts
  activeAlerts: Alert[];
}
```

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: WebRTC Stats Collection (Frontend)

#### 1.1. Create WebRTC Stats Hook
**File**: `hooks/useWebRTCStats.ts`

```typescript
import { useEffect, useState, useRef } from 'react';

interface PeerStats {
  peerId: string;
  uploadBitrate: number;
  downloadBitrate: number;
  latency: number;
  packetLoss: number;
}

export function useWebRTCStats(peerConnections: Map<string, RTCPeerConnection>) {
  const [stats, setStats] = useState<PeerStats[]>([]);
  const previousStats = useRef<Map<string, any>>(new Map());
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const newStats: PeerStats[] = [];
      
      for (const [peerId, pc] of peerConnections.entries()) {
        const stats = await pc.getStats();
        const peerStats = calculatePeerStats(peerId, stats, previousStats.current.get(peerId));
        newStats.push(peerStats);
        previousStats.current.set(peerId, stats);
      }
      
      setStats(newStats);
    }, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, [peerConnections]);
  
  return stats;
}

function calculatePeerStats(
  peerId: string,
  currentStats: RTCStatsReport,
  previousStats?: RTCStatsReport
): PeerStats {
  let uploadBitrate = 0;
  let downloadBitrate = 0;
  let latency = 0;
  let packetLoss = 0;
  
  currentStats.forEach((report) => {
    // Outbound (upload)
    if (report.type === 'outbound-rtp' && report.kind === 'video') {
      if (previousStats) {
        const prevReport = Array.from(previousStats.values()).find(
          (r: any) => r.type === 'outbound-rtp' && r.id === report.id
        );
        
        if (prevReport) {
          const bytesSent = report.bytesSent - prevReport.bytesSent;
          const timeDiff = (report.timestamp - prevReport.timestamp) / 1000;
          uploadBitrate += (bytesSent * 8) / timeDiff / 1000; // kbps
        }
      }
    }
    
    // Inbound (download)
    if (report.type === 'inbound-rtp' && report.kind === 'video') {
      if (previousStats) {
        const prevReport = Array.from(previousStats.values()).find(
          (r: any) => r.type === 'inbound-rtp' && r.id === report.id
        );
        
        if (prevReport) {
          const bytesReceived = report.bytesReceived - prevReport.bytesReceived;
          const timeDiff = (report.timestamp - prevReport.timestamp) / 1000;
          downloadBitrate += (bytesReceived * 8) / timeDiff / 1000; // kbps
        }
      }
      
      // Packet loss
      if (report.packetsLost && report.packetsReceived) {
        packetLoss = (report.packetsLost / (report.packetsLost + report.packetsReceived)) * 100;
      }
    }
    
    // Latency (RTT)
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      latency = report.currentRoundTripTime * 1000; // Convert to ms
    }
  });
  
  return {
    peerId,
    uploadBitrate: Math.round(uploadBitrate),
    downloadBitrate: Math.round(downloadBitrate),
    latency: Math.round(latency),
    packetLoss: Math.round(packetLoss * 10) / 10,
  };
}
```

#### 1.2. Update Meeting Room Component
**File**: `components/meeting-room/MeetingRoom.tsx`

```typescript
'use client';

import { useWebRTCStats } from '@/hooks/useWebRTCStats';
import { ConnectionQualityIndicator } from './ConnectionQualityIndicator';
import { BandwidthDisplay } from './BandwidthDisplay';

export function MeetingRoom({ meetingId }: { meetingId: string }) {
  const { peerConnections } = usePeerConnections(); // Existing hook
  const stats = useWebRTCStats(peerConnections);
  const socket = useSocket();
  
  // Calculate total bandwidth
  const totalUpload = stats.reduce((sum, s) => sum + s.uploadBitrate, 0);
  const totalDownload = stats.reduce((sum, s) => sum + s.downloadBitrate, 0);
  const avgLatency = stats.length > 0 
    ? stats.reduce((sum, s) => sum + s.latency, 0) / stats.length 
    : 0;
  
  // Determine connection quality
  const quality = getConnectionQuality(avgLatency, stats[0]?.packetLoss || 0);
  
  // Emit metrics to server
  useEffect(() => {
    if (stats.length > 0) {
      socket.emit('meeting:metrics', {
        meetingId,
        metrics: {
          uploadBitrate: totalUpload,
          downloadBitrate: totalDownload,
          latency: avgLatency,
          quality,
          timestamp: new Date(),
        },
      });
    }
  }, [stats, socket, meetingId]);
  
  return (
    <div className="meeting-room">
      {/* Existing meeting UI */}
      
      {/* NEW: Connection Quality Indicator */}
      <ConnectionQualityIndicator 
        quality={quality}
        latency={avgLatency}
        packetLoss={stats[0]?.packetLoss || 0}
      />
      
      {/* NEW: Bandwidth Display (collapsible) */}
      <BandwidthDisplay
        upload={totalUpload}
        download={totalDownload}
        latency={avgLatency}
        peerStats={stats}
      />
    </div>
  );
}

function getConnectionQuality(latency: number, packetLoss: number): string {
  if (latency < 100 && packetLoss < 1) return 'excellent';
  if (latency < 200 && packetLoss < 3) return 'good';
  if (latency < 400 && packetLoss < 5) return 'fair';
  return 'poor';
}
```

---

### Phase 2: UI Components

#### 2.1. Connection Quality Indicator
**File**: `components/meeting-room/ConnectionQualityIndicator.tsx`

```typescript
'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
  packetLoss: number;
}

export function ConnectionQualityIndicator({ quality, latency, packetLoss }: Props) {
  const config = {
    excellent: { color: 'bg-green-500', icon: Wifi, bars: 4, text: 'Excellent' },
    good: { color: 'bg-blue-500', icon: Wifi, bars: 3, text: 'Good' },
    fair: { color: 'bg-yellow-500', icon: Wifi, bars: 2, text: 'Fair' },
    poor: { color: 'bg-red-500', icon: WifiOff, bars: 1, text: 'Poor' },
  };
  
  const { color, icon: Icon, bars, text } = config[quality];
  
  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge className={`${color} text-white flex items-center gap-2 px-3 py-2`}>
        <Icon className="w-4 h-4" />
        <div className="flex gap-0.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-3 rounded-sm ${
                i < bars ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium">{text}</span>
      </Badge>
      
      {/* Tooltip on hover */}
      <div className="absolute top-full right-0 mt-2 bg-black/90 text-white text-xs p-2 rounded opacity-0 hover:opacity-100 transition-opacity">
        <div>Latency: {latency}ms</div>
        <div>Packet Loss: {packetLoss}%</div>
      </div>
    </div>
  );
}
```

#### 2.2. Bandwidth Display
**File**: `components/meeting-room/BandwidthDisplay.tsx`

```typescript
'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Props {
  upload: number;
  download: number;
  latency: number;
  peerStats: Array<{
    peerId: string;
    uploadBitrate: number;
    downloadBitrate: number;
    latency: number;
  }>;
}

export function BandwidthDisplay({ upload, download, latency, peerStats }: Props) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card className="fixed bottom-4 right-4 z-50 bg-black/80 text-white border-white/20">
      <div 
        className="p-3 cursor-pointer flex items-center gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <ArrowUp className="w-4 h-4 text-green-400" />
          <span className="text-sm font-mono">{formatBitrate(upload)}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <ArrowDown className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-mono">{formatBitrate(download)}</span>
        </div>
        
        <div className="text-xs text-gray-400">
          {latency}ms
        </div>
        
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
      
      {expanded && (
        <div className="border-t border-white/20 p-3 space-y-2">
          <div className="text-xs font-semibold mb-2">Per-Peer Stats:</div>
          {peerStats.map((stat) => (
            <div key={stat.peerId} className="text-xs flex justify-between items-center">
              <span className="text-gray-400">Peer {stat.peerId.slice(0, 8)}</span>
              <div className="flex gap-3">
                <span className="text-green-400">↑ {formatBitrate(stat.uploadBitrate)}</span>
                <span className="text-blue-400">↓ {formatBitrate(stat.downloadBitrate)}</span>
                <span className="text-gray-400">{stat.latency}ms</span>
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

---

### Phase 3: Backend - Metrics Gateway

#### 3.1. Socket.IO Event Handlers
**File**: `src/gateways/meeting-metrics.gateway.ts`

```typescript
@WebSocketGateway({
  namespace: '/meeting-metrics',
  cors: { origin: '*' },
})
export class MeetingMetricsGateway {
  @WebSocketServer()
  server: Server;
  
  constructor(
    private readonly redisService: RedisService,
  ) {}
  
  @SubscribeMessage('meeting:metrics')
  async handleMetrics(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      meetingId: string;
      metrics: UserMetrics;
    },
  ) {
    const { meetingId, metrics } = data;
    const userId = client.data.userId;
    
    // Store in Redis (TTL: 5 minutes)
    await this.redisService.set(
      `meeting:${meetingId}:user:${userId}:metrics`,
      JSON.stringify(metrics),
      300,
    );
    
    // Broadcast to admin dashboard
    this.server.to('admin-dashboard').emit('meeting:metrics:update', {
      meetingId,
      userId,
      metrics,
    });
    
    // Check for alerts
    this.checkAlerts(meetingId, userId, metrics);
  }
  
  @SubscribeMessage('admin:subscribe')
  handleAdminSubscribe(@ConnectedSocket() client: Socket) {
    client.join('admin-dashboard');
  }
  
  private async checkAlerts(meetingId: string, userId: string, metrics: UserMetrics) {
    const alerts = [];
    
    // High latency
    if (metrics.avgLatency > 300) {
      alerts.push({
        type: 'high-latency',
        severity: 'warning',
        message: `User ${userId} has high latency: ${metrics.avgLatency}ms`,
      });
    }
    
    // High packet loss
    if (metrics.packetLossRate > 5) {
      alerts.push({
        type: 'packet-loss',
        severity: 'warning',
        message: `User ${userId} has high packet loss: ${metrics.packetLossRate}%`,
      });
    }
    
    // Poor connection
    if (metrics.connectionQuality === 'poor') {
      alerts.push({
        type: 'poor-connection',
        severity: 'critical',
        message: `User ${userId} has poor connection quality`,
      });
    }
    
    if (alerts.length > 0) {
      this.server.to('admin-dashboard').emit('meeting:alerts', {
        meetingId,
        userId,
        alerts,
      });
    }
  }
}
```

---

### Phase 4: Admin Dashboard

#### 4.1. Real-time Meeting Monitor
**File**: `app/admin/meetings/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MeetingMetrics {
  meetingId: string;
  users: Map<string, UserMetrics>;
}

export default function AdminMeetingsMonitor() {
  const [meetings, setMeetings] = useState<Map<string, MeetingMetrics>>(new Map());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  useEffect(() => {
    // Subscribe to admin updates
    socket.emit('admin:subscribe');
    
    // Listen for metrics updates
    socket.on('meeting:metrics:update', ({ meetingId, userId, metrics }) => {
      setMeetings((prev) => {
        const meeting = prev.get(meetingId) || { meetingId, users: new Map() };
        meeting.users.set(userId, metrics);
        return new Map(prev).set(meetingId, meeting);
      });
    });
    
    // Listen for alerts
    socket.on('meeting:alerts', ({ meetingId, userId, alerts: newAlerts }) => {
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, 50));
    });
    
    return () => {
      socket.off('meeting:metrics:update');
      socket.off('meeting:alerts');
    };
  }, []);
  
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Live Meetings Monitor</h1>
      
      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="p-4 bg-orange-50 border-orange-200">
          <h2 className="font-semibold mb-2">Active Alerts</h2>
          <div className="space-y-1">
            {alerts.slice(0, 5).map((alert, i) => (
              <div key={i} className="text-sm text-orange-700">
                {alert.message}
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* Meetings List */}
      <div className="grid gap-4">
        {Array.from(meetings.values()).map((meeting) => (
          <Card key={meeting.meetingId} className="p-4">
            <h3 className="font-semibold mb-3">Meeting: {meeting.meetingId}</h3>
            
            <div className="space-y-2">
              {Array.from(meeting.users.entries()).map(([userId, metrics]) => (
                <div key={userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{userId}</span>
                    <Badge variant={getQualityVariant(metrics.connectionQuality)}>
                      {metrics.connectionQuality}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">↑ {metrics.totalUpload} kbps</span>
                    <span className="text-blue-600">↓ {metrics.totalDownload} kbps</span>
                    <span className="text-gray-600">{metrics.avgLatency}ms</span>
                    <span className="text-orange-600">{metrics.packetLossRate}% loss</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function getQualityVariant(quality: string) {
  switch (quality) {
    case 'excellent': return 'default';
    case 'good': return 'secondary';
    case 'fair': return 'outline';
    case 'poor': return 'destructive';
    default: return 'outline';
  }
}
```

---

## 📅 IMPLEMENTATION TIMELINE

### Week 1: Frontend Stats Collection
- **Day 1-2**: Create `useWebRTCStats` hook
- **Day 3**: Update MeetingRoom component
- **Day 4**: Create ConnectionQualityIndicator
- **Day 5**: Create BandwidthDisplay

### Week 2: Backend & Socket.IO
- **Day 1-2**: Create MeetingMetricsGateway
- **Day 3**: Implement Redis storage
- **Day 4**: Implement alert system
- **Day 5**: Testing

### Week 3: Admin Dashboard
- **Day 1-2**: Create admin meetings monitor
- **Day 3**: Add charts & visualizations
- **Day 4**: Add export functionality
- **Day 5**: Final testing & optimization

---

## ✅ SUCCESS CRITERIA

- ✅ Users see real-time bandwidth/latency in meeting
- ✅ Connection quality indicator updates every second
- ✅ Admin dashboard shows all active meetings
- ✅ Alerts trigger for poor connections
- ✅ No impact on existing features (mic, cam, share, chat)
- ✅ LiveKit remains untouched

---

## 🎯 NEXT STEPS

1. **Review & Approve** this plan
2. **Start Week 1** - Frontend implementation
3. **Test with real meetings**
4. **Iterate based on feedback**

**Ready to start?** 🚀
