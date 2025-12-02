'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Users, Activity, AlertTriangle, Download } from 'lucide-react';
import { BandwidthChart } from '@/components/admin/BandwidthChart';
import { QualityDistribution } from '@/components/admin/QualityDistribution';
import { ExportService } from '@/lib/export-service';

interface UserMetrics {
  uploadBitrate: number;
  downloadBitrate: number;
  latency: number;
  quality: string;
  usingRelay: boolean;
  packetLoss: number;
}

interface MeetingData {
  meetingId: string;
  users: Map<string, UserMetrics>;
  startTime: Date;
}

export default function AdminMeetingsPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [meetings, setMeetings] = useState<Map<string, MeetingData>>(new Map());
  const [alerts, setAlerts] = useState<any[]>([]);
  const [turnUsers, setTurnUsers] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    // Connect to meeting-metrics namespace
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const newSocket = io(`${socketUrl}/meeting-metrics`, {
      auth: {
        userId: 'admin',
      },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('✅ Admin connected to meeting-metrics');
      newSocket.emit('admin:subscribe');
    });

    // Listen for metrics updates
    newSocket.on('meeting:metrics:update', ({ meetingId, userId, metrics, timestamp }: any) => {
      setMeetings((prev) => {
        const meeting = prev.get(meetingId) || {
          meetingId,
          users: new Map(),
          startTime: new Date(timestamp),
        };
        
        meeting.users.set(userId, metrics);
        
        // Track TURN users
        if (metrics.usingRelay) {
          setTurnUsers((prev) => new Set(prev).add(userId));
        } else {
          setTurnUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        }
        
        return new Map(prev).set(meetingId, meeting);
      });
    });
    
    // Listen for alerts
    newSocket.on('meeting:alerts', ({ meetingId, userId, alerts: newAlerts, timestamp }: any) => {
      setAlerts((prev) => [
        ...newAlerts.map((a: any) => ({ ...a, meetingId, userId, timestamp })),
        ...prev,
      ].slice(0, 50)); // Keep last 50 alerts
    });

    setSocket(newSocket);
    
    return () => {
      newSocket.emit('admin:unsubscribe');
      newSocket.disconnect();
    };
  }, []);
  
  // Calculate statistics
  const stats = {
    totalMeetings: meetings.size,
    totalUsers: Array.from(meetings.values()).reduce((sum, m) => sum + m.users.size, 0),
    turnUsers: turnUsers.size,
    activeAlerts: alerts.filter(a => a.severity === 'critical').length,
  };
  
  // Calculate TURN cost (example: $0.05/user/hour)
  const turnCostPerHour = turnUsers.size * 0.05;
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Live Meetings Monitor</h1>
          <p className="text-gray-500">Real-time bandwidth and connection quality</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => ExportService.exportToCSV(meetings)}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => ExportService.exportToJSON(meetings)}
          >
            <Download className="w-4 h-4" />
            Export JSON
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalMeetings}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card className={stats.turnUsers > 0 ? 'border-orange-200 bg-orange-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              TURN Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.turnUsers}</div>
            <p className="text-xs text-orange-700 mt-1">
              Est. ${turnCostPerHour.toFixed(2)}/hour
            </p>
          </CardContent>
        </Card>
        
        <Card className={stats.activeAlerts > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.activeAlerts}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="meetings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="meetings">Active Meetings</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="meetings" className="space-y-4">
          {Array.from(meetings.values()).map((meeting) => (
            <MeetingCard key={meeting.meetingId} meeting={meeting} />
          ))}
          
          {meetings.size === 0 && (
            <Card className="p-12 text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No active meetings</p>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-4">
          <AlertsList alerts={alerts} />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsView meetings={meetings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Meeting Card Component
function MeetingCard({ meeting }: { meeting: MeetingData }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Meeting: {meeting.meetingId}</CardTitle>
            <p className="text-sm text-gray-500">
              {meeting.users.size} participants • Started {formatTime(meeting.startTime)}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide' : 'Show'} Details
          </Button>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent>
          <div className="space-y-2">
            {Array.from(meeting.users.entries()).map(([userId, metrics]) => (
              <UserMetricsRow key={userId} userId={userId} metrics={metrics} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// User Metrics Row Component
function UserMetricsRow({ userId, metrics }: { userId: string; metrics: UserMetrics }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
          {userId.slice(0, 2).toUpperCase()}
        </div>
        <span className="text-sm font-medium">{userId}</span>
        <Badge variant={getQualityVariant(metrics.quality)}>
          {metrics.quality}
        </Badge>
        {metrics.usingRelay && (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
            <DollarSign className="w-3 h-3 mr-1" />
            TURN
          </Badge>
        )}
      </div>
      
      <div className="flex gap-4 text-sm font-mono">
        <span className="text-green-600">↑ {Math.round(metrics.uploadBitrate)} kbps</span>
        <span className="text-blue-600">↓ {Math.round(metrics.downloadBitrate)} kbps</span>
        <span className="text-gray-600">{Math.round(metrics.latency)}ms</span>
        <span className="text-orange-600">{metrics.packetLoss.toFixed(1)}% loss</span>
      </div>
    </div>
  );
}

// Alerts List Component
function AlertsList({ alerts }: { alerts: any[] }) {
  if (alerts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">No alerts</p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <Card key={i} className={`p-4 ${getSeverityClass(alert.severity)}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={getSeverityVariant(alert.severity)}>
                  {alert.severity}
                </Badge>
                <span className="text-sm font-medium">{alert.type}</span>
              </div>
              <p className="text-sm text-gray-700">{alert.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                Meeting: {alert.meetingId} • User: {alert.userId}
              </p>
            </div>
            <span className="text-xs text-gray-500">
              {formatTime(new Date(alert.timestamp))}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Analytics View Component
function AnalyticsView({ meetings }: { meetings: Map<string, MeetingData> }) {
  // Calculate quality distribution
  const qualityData = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
  };
  
  // Calculate bandwidth over time (last 10 data points)
  const bandwidthData: Array<{ time: string; upload: number; download: number }> = [];
  const timePoints: string[] = [];
  
  Array.from(meetings.values()).forEach((meeting) => {
    Array.from(meeting.users.values()).forEach((metrics) => {
      const quality = metrics.quality.toLowerCase();
      if (quality in qualityData) {
        qualityData[quality as keyof typeof qualityData]++;
      }
      
      // Add to bandwidth data
      const now = new Date();
      const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (!timePoints.includes(timeStr)) {
        timePoints.push(timeStr);
        bandwidthData.push({
          time: timeStr,
          upload: metrics.uploadBitrate,
          download: metrics.downloadBitrate,
        });
      } else {
        const existing = bandwidthData.find(d => d.time === timeStr);
        if (existing) {
          existing.upload += metrics.uploadBitrate;
          existing.download += metrics.downloadBitrate;
        }
      }
    });
  });
  
  // Sort bandwidth data by time and take last 10
  const sortedBandwidthData = bandwidthData
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(-10);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BandwidthChart data={sortedBandwidthData.length > 0 ? sortedBandwidthData : [
        { time: '00:00', upload: 0, download: 0 }
      ]} />
      <QualityDistribution data={qualityData} />
    </div>
  );
}

// Helper functions
function getQualityVariant(quality: string) {
  switch (quality) {
    case 'excellent': return 'default';
    case 'good': return 'secondary';
    case 'fair': return 'outline';
    case 'poor': return 'destructive';
    default: return 'outline';
  }
}

function getSeverityClass(severity: string) {
  switch (severity) {
    case 'critical': return 'border-red-200 bg-red-50';
    case 'warning': return 'border-orange-200 bg-orange-50';
    case 'info': return 'border-blue-200 bg-blue-50';
    default: return '';
  }
}

function getSeverityVariant(severity: string) {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'warning': return 'outline';
    case 'info': return 'secondary';
    default: return 'outline';
  }
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

