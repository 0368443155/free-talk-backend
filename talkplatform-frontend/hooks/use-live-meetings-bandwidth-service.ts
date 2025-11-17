'use client';

import { useState, useEffect } from 'react';
import { 
  liveMeetingsBandwidthService, 
  LiveMeetingsBandwidthStats, 
  LiveMeetingBandwidthData 
} from '@/services/live-meetings-bandwidth-service';

interface UseLiveMeetingsBandwidthServiceProps {
  enabled: boolean;
  fetchInterval?: number; // How often to fetch live meetings from API
}

export function useLiveMeetingsBandwidthService({ 
  enabled, 
  fetchInterval = 10000 
}: UseLiveMeetingsBandwidthServiceProps) {
  const [stats, setStats] = useState<LiveMeetingsBandwidthStats>({
    totalLiveMeetings: 0,
    totalParticipants: 0,
    totalBandwidth: 0,
    meetings: [],
    lastFetched: Date.now()
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle stats updates from service
  const handleStatsUpdate = (newStats: LiveMeetingsBandwidthStats) => {
    setStats(newStats);
    setIsLoading(false);
    setError(null);
    
    console.log(`📊 [LIVE-HOOK] Stats updated: ${newStats.totalLiveMeetings} meetings, ${newStats.totalParticipants} participants, ${Math.round(newStats.totalBandwidth / 1024)} KB/s total`);
  };

  // Start/stop service based on enabled state
  useEffect(() => {
    if (enabled) {
      console.log('🚀 [LIVE-HOOK] Enabling live meetings bandwidth service');
      setIsLoading(true);
      
      // Add listener for updates
      liveMeetingsBandwidthService.addListener(handleStatsUpdate);
      
      // Start service
      liveMeetingsBandwidthService.start(fetchInterval);
      
      return () => {
        console.log('🛑 [LIVE-HOOK] Disabling live meetings bandwidth service');
        liveMeetingsBandwidthService.removeListener(handleStatsUpdate);
        liveMeetingsBandwidthService.stop();
      };
    } else {
      // Reset state when disabled
      setStats({
        totalLiveMeetings: 0,
        totalParticipants: 0,
        totalBandwidth: 0,
        meetings: [],
        lastFetched: Date.now()
      });
      setIsLoading(false);
      setError(null);
    }
  }, [enabled, fetchInterval]);

  return {
    stats,
    isLoading,
    error,
    // Expose service methods for additional control
    registerBandwidthData: (meetingId: string, bandwidthData: any) => {
      liveMeetingsBandwidthService.registerBandwidthData(meetingId, bandwidthData);
    },
    hasLiveMeeting: (meetingId: string) => {
      return liveMeetingsBandwidthService.hasLiveMeeting(meetingId);
    },
    getLiveMeetings: () => {
      return liveMeetingsBandwidthService.getLiveMeetings();
    }
  };
}