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
  youtube?: {
    downloadBitrate: number;
    quality: string;
  };
}

export function BandwidthDisplay({ upload, download, latency, peerStats, youtube }: Props) {
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
        
        {youtube && youtube.downloadBitrate > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-400">📺</span>
            <span className="text-sm font-mono tabular-nums text-purple-400">{formatBitrate(youtube.downloadBitrate)}</span>
            <span className="text-xs text-purple-300">({youtube.quality})</span>
          </div>
        )}
        
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

