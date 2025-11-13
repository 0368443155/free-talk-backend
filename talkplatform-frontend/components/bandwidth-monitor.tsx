'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBandwidthMonitor, BandwidthStats } from '@/hooks/use-bandwidth-monitor';
import { Activity, ArrowDown, ArrowUp, Signal, Wifi } from 'lucide-react';

interface BandwidthMonitorProps {
  peerConnection?: RTCPeerConnection | null;
  enabled?: boolean;
  compact?: boolean;
}

export function BandwidthMonitor({ peerConnection, enabled = true, compact = false }: BandwidthMonitorProps) {
  const stats = useBandwidthMonitor({ peerConnection, enabled });

  const getBandwidthColor = (bps: number) => {
    if (bps < 100 * 1024) return 'text-green-500'; // < 100 KB/s - Good
    if (bps < 500 * 1024) return 'text-yellow-500'; // < 500 KB/s - Moderate
    return 'text-red-500'; // >= 500 KB/s - High
  };

  const getConnectionQuality = (inbound: number, outbound: number) => {
    const total = inbound + outbound;
    if (total < 200 * 1024) return { label: 'Excellent', color: 'bg-green-500' };
    if (total < 500 * 1024) return { label: 'Good', color: 'bg-yellow-500' };
    if (total < 1024 * 1024) return { label: 'Fair', color: 'bg-orange-500' };
    return { label: 'Poor', color: 'bg-red-500' };
  };

  if (compact) {
    const quality = getConnectionQuality(stats.inbound, stats.outbound);
    return (
      <div className="flex items-center gap-2 text-sm">
        <Wifi className="h-4 w-4" />
        <span className="text-muted-foreground">
          ↓ {stats.inboundFormatted} | ↑ {stats.outboundFormatted}
        </span>
        <Badge className={quality.color}>{quality.label}</Badge>
      </div>
    );
  }

  const quality = getConnectionQuality(stats.inbound, stats.outbound);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Bandwidth Monitor
          <Badge className={`ml-auto ${quality.color}`}>{quality.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Real-time Bandwidth */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Current Usage</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowDown className="h-4 w-4" />
                <span>Download</span>
              </div>
              <p className={`text-2xl font-bold ${getBandwidthColor(stats.inbound)}`}>
                {stats.inboundFormatted}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowUp className="h-4 w-4" />
                <span>Upload</span>
              </div>
              <p className={`text-2xl font-bold ${getBandwidthColor(stats.outbound)}`}>
                {stats.outboundFormatted}
              </p>
            </div>
          </div>
        </div>

        {/* Total Transferred */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Total Transferred</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Downloaded:</span>
              <p className="font-semibold">{stats.totalInboundFormatted}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Uploaded:</span>
              <p className="font-semibold">{stats.totalOutboundFormatted}</p>
            </div>
          </div>
        </div>

        {/* Connection Quality Metrics */}
        {(stats.packetLoss !== undefined || stats.jitter !== undefined || stats.rtt !== undefined) && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-semibold text-muted-foreground">Connection Quality</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {stats.packetLoss !== undefined && (
                <div>
                  <span className="text-muted-foreground">Packet Loss:</span>
                  <p className="font-semibold">{stats.packetLoss.toFixed(0)}</p>
                </div>
              )}
              {stats.jitter !== undefined && (
                <div>
                  <span className="text-muted-foreground">Jitter:</span>
                  <p className="font-semibold">{stats.jitter.toFixed(2)} ms</p>
                </div>
              )}
              {stats.rtt !== undefined && (
                <div>
                  <span className="text-muted-foreground">RTT:</span>
                  <p className="font-semibold">{stats.rtt.toFixed(0)} ms</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>💡 Tip: Keep bandwidth under 500 KB/s for optimal performance</p>
        </div>
      </CardContent>
    </Card>
  );
}
