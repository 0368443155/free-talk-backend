'use client';

import { useEffect, useRef } from 'react';
import { useGlobalBandwidth } from '@/contexts/global-bandwidth-context';
import { useBandwidthMonitor, BandwidthStats } from './use-bandwidth-monitor';
import { liveMeetingsBandwidthService } from '@/services/live-meetings-bandwidth-service';
import { meetingBandwidthBridge } from '@/services/meeting-bandwidth-bridge';
import { crossTabBandwidthService } from '@/services/cross-tab-bandwidth-service';
import { roomAggregateBandwidthService } from '@/services/room-aggregate-bandwidth-service';

interface UseMeetingBandwidthReporterProps {
  meetingId: string;
  meetingTitle?: string;
  peerConnection?: RTCPeerConnection | null;
  participantCount: number;
  userId: string;
  username: string;
  enabled?: boolean;
}

export function useMeetingBandwidthReporter({
  meetingId,
  meetingTitle,
  peerConnection,
  participantCount,
  userId,
  username,
  enabled = true
}: UseMeetingBandwidthReporterProps) {
  const { 
    registerMeeting, 
    unregisterMeeting, 
    updateMeetingStats,
    isMonitoring 
  } = useGlobalBandwidth();
  
  const isRegisteredRef = useRef(false);
  const lastStatsRef = useRef<BandwidthStats | null>(null);

  // Monitor bandwidth using existing hook
  const bandwidthStats = useBandwidthMonitor({
    peerConnection,
    enabled: enabled,
    interval: 1000
  });

  // Debug peer connection and bandwidth stats
  useEffect(() => {
    console.log(`📊 [REPORTER-DEBUG] Meeting ${meetingId.slice(0, 8)}:`);
    console.log(`  - PeerConnection:`, peerConnection);
    console.log(`  - BandwidthStats:`, bandwidthStats);
    console.log(`  - Participants:`, participantCount);
    console.log(`  - Enabled:`, enabled);
  }, [meetingId, peerConnection, bandwidthStats, participantCount, enabled]);

  // Register meeting on mount (always register, regardless of monitoring state)
  useEffect(() => {
    console.log(`📊 [REPORTER] Effect called - enabled: ${enabled}, meetingId: ${meetingId}, isRegistered: ${isRegisteredRef.current}`);
    
    if (enabled && meetingId && !isRegisteredRef.current) {
      // Register with global context (for WebRTC detection)
      registerMeeting(meetingId, meetingTitle);
      
      // Also register with bridge (for admin dashboard)
      meetingBandwidthBridge.registerMeeting(meetingId, meetingTitle || 'Untitled Meeting');
      
      // Initialize cross-tab service
      crossTabBandwidthService.init();
      
      // Initialize room aggregate service
      roomAggregateBandwidthService.init();
      
      isRegisteredRef.current = true;
      console.log(`📊 [REPORTER] ✅ Registered meeting ${meetingId.slice(0, 8)} (${meetingTitle || 'Untitled'}) - User: ${username} (${userId.slice(0, 8)}) for bandwidth monitoring`);
    }

    return () => {
      if (isRegisteredRef.current) {
        unregisterMeeting(meetingId);
        meetingBandwidthBridge.unregisterMeeting(meetingId);
        crossTabBandwidthService.removeMeeting(meetingId);
        isRegisteredRef.current = false;
        console.log(`📊 [REPORTER] ❌ Unregistered meeting ${meetingId.slice(0, 8)} from bandwidth monitoring`);
      }
    };
  }, [meetingId, meetingTitle, enabled, registerMeeting, unregisterMeeting]);

  // Update stats when bandwidth changes (always update when available)
  useEffect(() => {
    console.log(`📊 [REPORTER] Update effect - enabled: ${enabled}, isRegistered: ${isRegisteredRef.current}, bandwidthStats:`, bandwidthStats);
    
    if (
      enabled && 
      isRegisteredRef.current && 
      bandwidthStats && 
      (lastStatsRef.current?.inbound !== bandwidthStats.inbound || 
       lastStatsRef.current?.outbound !== bandwidthStats.outbound)
    ) {
      // Update global bandwidth context (for WebRTC detected meetings)
      updateMeetingStats(meetingId, bandwidthStats, participantCount);
      
      // Update bridge (for same tab)
      meetingBandwidthBridge.updateBandwidth(meetingId, {
        inbound: bandwidthStats.inbound,
        outbound: bandwidthStats.outbound,
        inboundFormatted: bandwidthStats.inboundFormatted,
        outboundFormatted: bandwidthStats.outboundFormatted
      }, participantCount);
      
      // MAIN PATH: Update cross-tab service (for admin dashboard in other tabs)
      crossTabBandwidthService.updateMeeting(meetingId, meetingTitle || 'Untitled Meeting', {
        inbound: bandwidthStats.inbound,
        outbound: bandwidthStats.outbound,
        inboundFormatted: bandwidthStats.inboundFormatted,
        outboundFormatted: bandwidthStats.outboundFormatted
      }, participantCount);
      
      // Also register with live meetings service (if this meeting is live)
      const hasLiveMeeting = liveMeetingsBandwidthService.hasLiveMeeting(meetingId);
      if (hasLiveMeeting) {
        liveMeetingsBandwidthService.registerBandwidthData(meetingId, {
          inbound: bandwidthStats.inbound,
          outbound: bandwidthStats.outbound,
          inboundFormatted: bandwidthStats.inboundFormatted,
          outboundFormatted: bandwidthStats.outboundFormatted
        });
        console.log(`📊 [REPORTER] 🔄 Also sent to live service for ${meetingId.slice(0, 8)}`);
      }
      
      lastStatsRef.current = bandwidthStats;
      
      // Log all updates for debugging
      const totalBandwidth = bandwidthStats.inbound + bandwidthStats.outbound;
      console.log(`📊 [REPORTER] 🔄 Updated ${meetingId.slice(0, 8)}: ${bandwidthStats.inboundFormatted} down, ${bandwidthStats.outboundFormatted} up, ${participantCount} participants, total: ${Math.round(totalBandwidth / 1024)} KB/s`);
    } else {
      if (!bandwidthStats) {
        console.log(`📊 [REPORTER] No bandwidth stats available from useBandwidthMonitor`);
      }
    }
  }, [
    enabled,
    meetingId,
    bandwidthStats,
    participantCount,
    updateMeetingStats
  ]);

  return {
    bandwidthStats,
    isReporting: enabled && isMonitoring && isRegisteredRef.current
  };
}