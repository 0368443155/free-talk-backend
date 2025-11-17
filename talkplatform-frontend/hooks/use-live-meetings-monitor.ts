'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLiveMeetingsApi, getPublicMeetingParticipantsApi, IMeeting, IMeetingParticipant } from '@/api/meeting.rest';

export interface LiveMeetingBandwidthData {
  meetingId: string;
  meetingTitle: string;
  participantCount: number;
  estimatedInbound: number; // bytes per second
  estimatedOutbound: number; // bytes per second
  totalBandwidth: number;
  lastUpdated: number;
}

export interface LiveMeetingStats {
  totalMeetings: number;
  totalParticipants: number;
  totalInboundBps: number;
  totalOutboundBps: number;
  totalBandwidthBps: number;
  meetings: LiveMeetingBandwidthData[];
}

export function useLiveMeetingsMonitor(enabled: boolean = false, interval: number = 5000) {
  const [liveMeetings, setLiveMeetings] = useState<LiveMeetingBandwidthData[]>([]);
  const [stats, setStats] = useState<LiveMeetingStats>({
    totalMeetings: 0,
    totalParticipants: 0,
    totalInboundBps: 0,
    totalOutboundBps: 0,
    totalBandwidthBps: 0,
    meetings: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This hook will be replaced by using the global bandwidth context
  // which collects real WebRTC data from active meetings
  const collectRealBandwidthData = useCallback(() => {
    // This function is now deprecated - we should use GlobalBandwidthContext
    // which already collects real WebRTC bandwidth data from active meetings
    console.log('📊 [LIVE-MONITOR] Using real WebRTC data collection instead of estimation');
    return { inbound: 0, outbound: 0 };
  }, []);

  // Fetch live meetings and their participants
  const fetchLiveMeetings = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get all live meetings
      const meetings = await getLiveMeetingsApi();
      console.log(`📊 [LIVE-MONITOR] Found ${meetings.length} live meetings`);

      // Get participants for each meeting and estimate bandwidth
      const meetingBandwidthPromises = meetings.map(async (meeting): Promise<LiveMeetingBandwidthData> => {
        try {
          const participants = await getPublicMeetingParticipantsApi(meeting.id);
          const participantCount = participants.length;
          
          const bandwidthEstimate = estimateBandwidth(participantCount);
          
          console.log(`📊 [LIVE-MONITOR] Meeting ${meeting.id}: ${participantCount} participants, estimated ${Math.round((bandwidthEstimate.inbound + bandwidthEstimate.outbound) / 1024)} KB/s`);

          return {
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            participantCount,
            estimatedInbound: bandwidthEstimate.inbound,
            estimatedOutbound: bandwidthEstimate.outbound,
            totalBandwidth: bandwidthEstimate.inbound + bandwidthEstimate.outbound,
            lastUpdated: Date.now()
          };
        } catch (err) {
          console.warn(`📊 [LIVE-MONITOR] Failed to get participants for meeting ${meeting.id}:`, err);
          // Return empty data for failed meetings
          return {
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            participantCount: 0,
            estimatedInbound: 0,
            estimatedOutbound: 0,
            totalBandwidth: 0,
            lastUpdated: Date.now()
          };
        }
      });

      const meetingBandwidthData = await Promise.all(meetingBandwidthPromises);
      setLiveMeetings(meetingBandwidthData);

      // Calculate aggregate stats
      const totalMeetings = meetingBandwidthData.length;
      const totalParticipants = meetingBandwidthData.reduce((sum, meeting) => sum + meeting.participantCount, 0);
      const totalInboundBps = meetingBandwidthData.reduce((sum, meeting) => sum + meeting.estimatedInbound, 0);
      const totalOutboundBps = meetingBandwidthData.reduce((sum, meeting) => sum + meeting.estimatedOutbound, 0);
      const totalBandwidthBps = totalInboundBps + totalOutboundBps;

      setStats({
        totalMeetings,
        totalParticipants,
        totalInboundBps,
        totalOutboundBps,
        totalBandwidthBps,
        meetings: meetingBandwidthData
      });

      console.log(`📊 [LIVE-MONITOR] Total: ${totalMeetings} meetings, ${totalParticipants} participants, ${Math.round(totalBandwidthBps / 1024)} KB/s`);

    } catch (err: any) {
      console.error('📊 [LIVE-MONITOR] Error fetching live meetings:', err);
      setError(err.message || 'Failed to fetch live meetings');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, estimateBandwidth]);

  // Periodic fetching
  useEffect(() => {
    if (!enabled) {
      setLiveMeetings([]);
      setStats({
        totalMeetings: 0,
        totalParticipants: 0,
        totalInboundBps: 0,
        totalOutboundBps: 0,
        totalBandwidthBps: 0,
        meetings: []
      });
      return;
    }

    // Fetch immediately
    fetchLiveMeetings();

    // Set up interval
    const intervalId = setInterval(fetchLiveMeetings, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval, fetchLiveMeetings]);

  return {
    liveMeetings,
    stats,
    isLoading,
    error,
    refresh: fetchLiveMeetings
  };
}