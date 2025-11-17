'use client';

import { useState, useEffect } from 'react';
import { meetingBandwidthBridge } from '@/services/meeting-bandwidth-bridge';

interface MeetingBandwidthData {
  meetingId: string;
  meetingTitle: string;
  participantCount: number;
  bandwidth: {
    inbound: number;
    outbound: number;
    inboundFormatted: string;
    outboundFormatted: string;
    total: number;
    totalFormatted: string;
  };
  lastUpdated: number;
}

interface BridgeStats {
  totalMeetings: number;
  totalParticipants: number;
  totalInbound: number;
  totalOutbound: number;
  totalBandwidth: number;
  meetings: MeetingBandwidthData[];
}

export function useMeetingBandwidthBridge(enabled: boolean = false) {
  const [meetings, setMeetings] = useState<MeetingBandwidthData[]>([]);
  const [stats, setStats] = useState<BridgeStats>({
    totalMeetings: 0,
    totalParticipants: 0,
    totalInbound: 0,
    totalOutbound: 0,
    totalBandwidth: 0,
    meetings: []
  });

  // Update meetings and stats when bridge data changes
  const handleMeetingsUpdate = (updatedMeetings: MeetingBandwidthData[]) => {
    console.log(`🌉 [BRIDGE-HOOK] Received update:`, updatedMeetings);
    setMeetings(updatedMeetings);
    
    // Calculate stats
    const aggregated = meetingBandwidthBridge.getAggregatedStats();
    console.log(`🌉 [BRIDGE-HOOK] Aggregated stats:`, aggregated);
    
    setStats({
      totalMeetings: aggregated.totalMeetings,
      totalParticipants: aggregated.totalParticipants,
      totalInbound: aggregated.totalInbound,
      totalOutbound: aggregated.totalOutbound,
      totalBandwidth: aggregated.totalBandwidth,
      meetings: aggregated.meetings
    });

    console.log(`🌉 [BRIDGE-HOOK] Updated: ${aggregated.totalMeetings} meetings, ${aggregated.totalParticipants} participants, ${Math.round(aggregated.totalBandwidth / 1024)} KB/s`);
  };

  // Subscribe/unsubscribe to bridge updates
  useEffect(() => {
    if (enabled) {
      console.log('🌉 [BRIDGE-HOOK] Subscribing to bandwidth bridge');
      meetingBandwidthBridge.addListener(handleMeetingsUpdate);
      
      return () => {
        console.log('🌉 [BRIDGE-HOOK] Unsubscribing from bandwidth bridge');
        meetingBandwidthBridge.removeListener(handleMeetingsUpdate);
      };
    } else {
      // Reset when disabled
      setMeetings([]);
      setStats({
        totalMeetings: 0,
        totalParticipants: 0,
        totalInbound: 0,
        totalOutbound: 0,
        totalBandwidth: 0,
        meetings: []
      });
    }
  }, [enabled]);

  return {
    meetings,
    stats,
    // Expose bridge methods for manual operations
    registerMeeting: (meetingId: string, meetingTitle: string) => {
      meetingBandwidthBridge.registerMeeting(meetingId, meetingTitle);
    },
    updateBandwidth: (meetingId: string, bandwidth: any, participantCount: number) => {
      meetingBandwidthBridge.updateBandwidth(meetingId, bandwidth, participantCount);
    },
    unregisterMeeting: (meetingId: string) => {
      meetingBandwidthBridge.unregisterMeeting(meetingId);
    }
  };
}