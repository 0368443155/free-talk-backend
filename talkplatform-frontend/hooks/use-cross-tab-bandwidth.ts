'use client';

import { useState, useEffect } from 'react';
import { crossTabBandwidthService } from '@/services/cross-tab-bandwidth-service';

interface CrossTabBandwidthData {
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

interface CrossTabStats {
  totalMeetings: number;
  totalParticipants: number;
  totalInbound: number;
  totalOutbound: number;
  totalBandwidth: number;
  meetings: CrossTabBandwidthData[];
}

export function useCrossTabBandwidth(enabled: boolean = false) {
  const [meetings, setMeetings] = useState<CrossTabBandwidthData[]>([]);
  const [stats, setStats] = useState<CrossTabStats>({
    totalMeetings: 0,
    totalParticipants: 0,
    totalInbound: 0,
    totalOutbound: 0,
    totalBandwidth: 0,
    meetings: []
  });

  // Handle meetings updates from cross-tab service
  const handleMeetingsUpdate = (updatedMeetings: CrossTabBandwidthData[]) => {
    console.log(`🔄 [CROSS-TAB-HOOK] Received ${updatedMeetings.length} meetings:`, updatedMeetings);
    setMeetings(updatedMeetings);
    
    // Calculate aggregated stats
    const aggregated = crossTabBandwidthService.getAggregatedStats();
    setStats({
      totalMeetings: aggregated.totalMeetings,
      totalParticipants: aggregated.totalParticipants,
      totalInbound: aggregated.totalInbound,
      totalOutbound: aggregated.totalOutbound,
      totalBandwidth: aggregated.totalBandwidth,
      meetings: aggregated.meetings
    });

    if (updatedMeetings.length > 0) {
      console.log(`🔄 [CROSS-TAB-HOOK] Stats: ${aggregated.totalMeetings} meetings, ${aggregated.totalParticipants} participants, ${Math.round(aggregated.totalBandwidth / 1024)} KB/s`);
    }
  };

  // Subscribe/unsubscribe to cross-tab service
  useEffect(() => {
    if (enabled) {
      console.log('🔄 [CROSS-TAB-HOOK] Subscribing to cross-tab bandwidth service');
      
      // Initialize service
      crossTabBandwidthService.init();
      
      // Add listener
      crossTabBandwidthService.addListener(handleMeetingsUpdate);
      
      return () => {
        console.log('🔄 [CROSS-TAB-HOOK] Unsubscribing from cross-tab bandwidth service');
        crossTabBandwidthService.removeListener(handleMeetingsUpdate);
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
    // Expose service methods for manual operations
    updateMeeting: (meetingId: string, meetingTitle: string, bandwidth: any, participantCount: number) => {
      crossTabBandwidthService.updateMeeting(meetingId, meetingTitle, bandwidth, participantCount);
    },
    removeMeeting: (meetingId: string) => {
      crossTabBandwidthService.removeMeeting(meetingId);
    }
  };
}