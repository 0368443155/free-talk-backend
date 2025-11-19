"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Phone,
  Settings,
  Users,
  MessageSquare,
  Play,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface MeetingControlsProps {
  // Media states
  isCameraEnabled: boolean;
  isMicEnabled: boolean;
  isScreenSharing: boolean;
  
  // Actions
  onToggleCamera: () => void;
  onToggleMicrophone: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  
  
  // Bandwidth monitoring
  bandwidth?: {
    inbound: number; // KB/s
    outbound: number; // KB/s
    latency: number; // ms
    quality: 'excellent' | 'good' | 'poor';
  };
  
  disabled?: boolean;
}

/**
 * Enhanced meeting controls with bandwidth monitoring
 */
export function MeetingControls({
  isCameraEnabled,
  isMicEnabled,
  isScreenSharing,
  onToggleCamera,
  onToggleMicrophone,
  onToggleScreenShare,
  onLeave,
  bandwidth,
  disabled = false,
}: MeetingControlsProps) {
  
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-orange-500'; 
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatBandwidth = (value: number) => {
    if (value >= 1024) {
      return `${(value / 1024).toFixed(1)}MB/s`;
    }
    return `${value.toFixed(0)}KB/s`;
  };

  return (
    <div className="flex justify-between items-center w-full">
      {/* Left side - Bandwidth monitoring */}
      <div className="flex items-center gap-4">
        {bandwidth && (
          <div className="flex items-center gap-3 text-sm text-gray-300">
            {/* Quality indicator */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getQualityColor(bandwidth.quality)}`} />
              <span className="text-xs">Quality</span>
            </div>
            
            {/* Inbound bandwidth */}
            <div className="flex items-center gap-1">
              <ArrowDown className="w-3 h-3 text-blue-400" />
              <span className="text-xs">{formatBandwidth(bandwidth.inbound)}</span>
            </div>
            
            {/* Outbound bandwidth */}
            <div className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-green-400" />
              <span className="text-xs">{formatBandwidth(bandwidth.outbound)}</span>
            </div>
            
            {/* Latency */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Latency:</span>
              <span className="text-xs">{bandwidth.latency}ms</span>
            </div>
          </div>
        )}
      </div>

      {/* Center - Main controls */}
      <div className="flex items-center gap-2">
        {/* Camera toggle */}
        <Button
          variant={isCameraEnabled ? "secondary" : "destructive"}
          size="lg"
          onClick={onToggleCamera}
          disabled={disabled}
          className="rounded-full w-12 h-12 p-0"
        >
          {isCameraEnabled ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
        </Button>

        {/* Microphone toggle */}
        <Button
          variant={isMicEnabled ? "secondary" : "destructive"}
          size="lg"
          onClick={onToggleMicrophone}
          disabled={disabled}
          className="rounded-full w-12 h-12 p-0"
        >
          {isMicEnabled ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </Button>

        {/* Screen share toggle */}
        <Button
          variant={isScreenSharing ? "default" : "outline"}
          size="lg"
          onClick={onToggleScreenShare}
          disabled={disabled}
          className="rounded-full w-12 h-12 p-0"
        >
          {isScreenSharing ? (
            <MonitorOff className="w-5 h-5" />
          ) : (
            <Monitor className="w-5 h-5" />
          )}
        </Button>

        {/* Leave button */}
        <Button
          variant="destructive"
          size="lg"
          onClick={onLeave}
          className="rounded-full px-6 ml-4"
        >
          <Phone className="w-4 h-4 mr-2" />
          Leave
        </Button>
      </div>

      {/* Right side - Empty space for balance */}
      <div className="w-0"></div>
    </div>
  );
}