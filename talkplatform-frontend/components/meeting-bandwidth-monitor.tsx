"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, ArrowDown, ArrowUp, Users, Wifi, X } from 'lucide-react';

interface BandwidthStats {
  inbound: number;
  outbound: number;
  totalParticipants: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
}

interface MeetingBandwidthMonitorProps {
  meetingId: string;
  meetingTitle: string;
  participantCount: number;
  isWebRTCActive: boolean;
  userId: string;
  username: string;
  peerConnection?: RTCPeerConnection;
  enabled?: boolean;
}

export function MeetingBandwidthMonitor({
  meetingId,
  meetingTitle,
  participantCount,
  isWebRTCActive,
  userId,
  username,
  peerConnection,
  enabled = true
}: MeetingBandwidthMonitorProps) {
  const [stats, setStats] = useState<BandwidthStats>({
    inbound: 0,
    outbound: 0,
    totalParticipants: participantCount,
    connectionQuality: 'excellent',
    latency: 0
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);

  // Format bytes per second
  const formatBandwidth = (bytes: number): string => {
    if (bytes === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get connection quality color
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Collect WebRTC stats with previous values for rate calculation
  const previousStats = useState({ inbound: 0, outbound: 0, timestamp: Date.now() })[0];
  
  const collectStats = async () => {
    if (!peerConnection || !enabled || !isWebRTCActive) {
      return;
    }

    try {
      const stats = await peerConnection.getStats();
      let currentInbound = 0;
      let currentOutbound = 0;
      let rtt = 0;

      stats.forEach((report) => {
        // Get total bytes (cumulative)
        if (report.type === 'inbound-rtp') {
          currentInbound += report.bytesReceived || 0;
        }
        if (report.type === 'outbound-rtp') {
          currentOutbound += report.bytesSent || 0;
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          rtt = report.currentRoundTripTime * 1000 || 0; // Convert to ms
        }
      });

      const now = Date.now();
      const timeDiff = (now - previousStats.timestamp) / 1000; // seconds
      
      // Calculate bytes per second (rate)
      let inboundRate = 0;
      let outboundRate = 0;
      
      if (timeDiff > 0 && previousStats.timestamp > 0) {
        inboundRate = Math.max(0, (currentInbound - previousStats.inbound) / timeDiff);
        outboundRate = Math.max(0, (currentOutbound - previousStats.outbound) / timeDiff);
      }

      // Update previous stats for next calculation
      previousStats.inbound = currentInbound;
      previousStats.outbound = currentOutbound;
      previousStats.timestamp = now;

      // Calculate quality based on bandwidth rate and latency
      let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
      const totalRate = inboundRate + outboundRate;
      
      if (rtt > 200 || totalRate < 10000) quality = 'poor';        // < 10KB/s or >200ms RTT
      else if (rtt > 100 || totalRate < 50000) quality = 'fair';  // < 50KB/s or >100ms RTT  
      else if (rtt > 50 || totalRate < 100000) quality = 'good';  // < 100KB/s or >50ms RTT

      setStats({
        inbound: Math.round(inboundRate),
        outbound: Math.round(outboundRate),
        totalParticipants: participantCount,
        connectionQuality: quality,
        latency: Math.round(rtt)
      });

      setIsCollecting(true);
    } catch (error) {
      console.warn('Failed to collect WebRTC stats:', error);
      setIsCollecting(false);
    }
  };

  // Auto collect stats every 2 seconds
  useEffect(() => {
    if (!enabled || !isWebRTCActive) return;

    const interval = setInterval(collectStats, 2000);
    collectStats(); // Initial collection

    return () => clearInterval(interval);
  }, [peerConnection, enabled, isWebRTCActive, participantCount]);

  if (!enabled) return null;

  return (
    <Card className="w-80 shadow-lg border-border/50 bg-background/95 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Meeting Bandwidth
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isWebRTCActive && isCollecting ? "default" : "secondary"}>
              {isWebRTCActive && isCollecting ? "Active" : "Inactive"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? "↑" : "↓"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="space-y-4">
          {/* Connection Quality */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Quality:</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getQualityColor(stats.connectionQuality).replace('text-', 'bg-')}`} />
              <span className={`text-sm capitalize ${getQualityColor(stats.connectionQuality)}`}>
                {stats.connectionQuality}
              </span>
            </div>
          </div>

          {/* Bandwidth Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                <ArrowDown className="h-3 w-3" />
                <span className="text-xs font-medium">Inbound</span>
              </div>
              <div className="text-sm font-semibold">
                {formatBandwidth(stats.inbound)}
              </div>
            </div>
            
            <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <ArrowUp className="h-3 w-3" />
                <span className="text-xs font-medium">Outbound</span>
              </div>
              <div className="text-sm font-semibold">
                {formatBandwidth(stats.outbound)}
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Participants:</span>
              <span>{stats.totalParticipants}</span>
            </div>
            <div className="flex justify-between">
              <span>Latency:</span>
              <span>{stats.latency}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Meeting:</span>
              <span className="truncate max-w-[150px]">{meetingTitle}</span>
            </div>
          </div>

          {/* Status Indicators */}
          {!isWebRTCActive && (
            <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded">
              <span className="text-xs text-yellow-700 dark:text-yellow-300">
                📡 Waiting for WebRTC connection...
              </span>
            </div>
          )}

          {isWebRTCActive && !isCollecting && (
            <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/30 rounded">
              <span className="text-xs text-orange-700 dark:text-orange-300">
                ⚠️ Unable to collect stats
              </span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}