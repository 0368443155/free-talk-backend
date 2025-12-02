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

