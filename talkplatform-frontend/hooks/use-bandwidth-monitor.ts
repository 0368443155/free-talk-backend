import { useEffect, useState, useRef } from 'react';

export interface BandwidthStats {
  inbound: number;
  outbound: number;
  totalInbound: number;
  totalOutbound: number;
  inboundFormatted: string;
  outboundFormatted: string;
  totalInboundFormatted: string;
  totalOutboundFormatted: string;
  packetLoss?: number;
  jitter?: number;
  rtt?: number;
  videoInbound?: number;
  videoOutbound?: number;
  audioInbound?: number;
  audioOutbound?: number;
}

interface UseBandwidthMonitorProps {
  peerConnection?: RTCPeerConnection | null;
  enabled?: boolean;
  interval?: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatBytesPerSecond = (bytes: number): string => {
  return `${formatBytes(bytes)}/s`;
};

export function useBandwidthMonitor({ 
  peerConnection, 
  enabled = true,
  interval = 1000 
}: UseBandwidthMonitorProps) {
  const [stats, setStats] = useState<BandwidthStats>({
    inbound: 0,
    outbound: 0,
    totalInbound: 0,
    totalOutbound: 0,
    inboundFormatted: '0 B/s',
    outboundFormatted: '0 B/s',
    totalInboundFormatted: '0 B',
    totalOutboundFormatted: '0 B',
  });

  const previousStatsRef = useRef<{
    timestamp: number;
    bytesReceived: number;
    bytesSent: number;
  }>({
    timestamp: Date.now(),
    bytesReceived: 0,
    bytesSent: 0,
  });

  useEffect(() => {
    if (!enabled || !peerConnection) {
      return;
    }

    const updateStats = async () => {
      try {
        const rtcStats = await peerConnection.getStats();
        
        let totalBytesReceived = 0;
        let totalBytesSent = 0;

        rtcStats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.bytesReceived) {
            totalBytesReceived += report.bytesReceived;
          }
          if (report.type === 'outbound-rtp' && report.bytesSent) {
            totalBytesSent += report.bytesSent;
          }
        });

        const now = Date.now();
        const timeDelta = (now - previousStatsRef.current.timestamp) / 1000;

        if (timeDelta > 0) {
          const bytesReceivedDelta = totalBytesReceived - previousStatsRef.current.bytesReceived;
          const bytesSentDelta = totalBytesSent - previousStatsRef.current.bytesSent;
          const inboundBps = bytesReceivedDelta / timeDelta;
          const outboundBps = bytesSentDelta / timeDelta;

          setStats({
            inbound: inboundBps,
            outbound: outboundBps,
            totalInbound: totalBytesReceived,
            totalOutbound: totalBytesSent,
            inboundFormatted: formatBytesPerSecond(inboundBps),
            outboundFormatted: formatBytesPerSecond(outboundBps),
            totalInboundFormatted: formatBytes(totalBytesReceived),
            totalOutboundFormatted: formatBytes(totalBytesSent),
          });

          previousStatsRef.current = {
            timestamp: now,
            bytesReceived: totalBytesReceived,
            bytesSent: totalBytesSent,
          };
        }
      } catch (error) {
        console.error('Failed to get RTC stats:', error);
      }
    };

    updateStats();
    const intervalId = setInterval(updateStats, interval);

    return () => clearInterval(intervalId);
  }, [peerConnection, enabled, interval]);

  return stats;
}
