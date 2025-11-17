'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { BandwidthStats } from '@/hooks/use-bandwidth-monitor';

export interface MeetingBandwidthData {
  meetingId: string;
  meetingTitle?: string;
  participantCount: number;
  stats: BandwidthStats;
  lastUpdated: number;
  isActive: boolean;
}

export interface GlobalBandwidthStats {
  totalMeetings: number;
  totalParticipants: number;
  totalInboundBps: number;
  totalOutboundBps: number;
  totalBandwidthBps: number;
  totalInboundBytes: number;
  totalOutboundBytes: number;
  averageBandwidthPerParticipant: number;
  meetings: Map<string, MeetingBandwidthData>;
}

interface GlobalBandwidthContextType {
  globalStats: GlobalBandwidthStats;
  registerMeeting: (meetingId: string, title?: string) => void;
  unregisterMeeting: (meetingId: string) => void;
  updateMeetingStats: (meetingId: string, stats: BandwidthStats, participantCount: number) => void;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  resetStats: () => void;
}

const GlobalBandwidthContext = createContext<GlobalBandwidthContextType | undefined>(undefined);

export function GlobalBandwidthProvider({ children }: { children: React.ReactNode }) {
  const [meetings, setMeetings] = useState<Map<string, MeetingBandwidthData>>(new Map());
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [globalTotalBytes, setGlobalTotalBytes] = useState({ inbound: 0, outbound: 0 });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [globalStats, setGlobalStats] = useState<GlobalBandwidthStats>({
    totalMeetings: 0,
    totalParticipants: 0,
    totalInboundBps: 0,
    totalOutboundBps: 0,
    totalBandwidthBps: 0,
    totalInboundBytes: 0,
    totalOutboundBytes: 0,
    averageBandwidthPerParticipant: 0,
    meetings: new Map()
  });

  // Register a new meeting for monitoring
  const registerMeeting = useCallback((meetingId: string, title?: string) => {
    setMeetings(prev => {
      const newMeetings = new Map(prev);
      if (!newMeetings.has(meetingId)) {
        newMeetings.set(meetingId, {
          meetingId,
          meetingTitle: title,
          participantCount: 0,
          stats: {
            inbound: 0,
            outbound: 0,
            totalInbound: 0,
            totalOutbound: 0,
            inboundFormatted: '0 B/s',
            outboundFormatted: '0 B/s',
            totalInboundFormatted: '0 B',
            totalOutboundFormatted: '0 B',
          },
          lastUpdated: Date.now(),
          isActive: true
        });
        console.log(`📊 [GLOBAL] Registered meeting: ${meetingId}`);
      }
      return newMeetings;
    });
  }, []);

  // Unregister a meeting
  const unregisterMeeting = useCallback((meetingId: string) => {
    setMeetings(prev => {
      const newMeetings = new Map(prev);
      newMeetings.delete(meetingId);
      console.log(`📊 [GLOBAL] Unregistered meeting: ${meetingId}`);
      return newMeetings;
    });
  }, []);

  // Update stats for a specific meeting
  const updateMeetingStats = useCallback((meetingId: string, stats: BandwidthStats, participantCount: number) => {
    setMeetings(prev => {
      const newMeetings = new Map(prev);
      const existing = newMeetings.get(meetingId);
      if (existing) {
        newMeetings.set(meetingId, {
          ...existing,
          stats,
          participantCount,
          lastUpdated: Date.now(),
          isActive: true
        });
      }
      return newMeetings;
    });
  }, []);

  // Start global monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    console.log('📊 [GLOBAL] Started global bandwidth monitoring');
  }, []);

  // Stop global monitoring  
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    console.log('📊 [GLOBAL] Stopped global bandwidth monitoring');
  }, []);

  // Reset all stats
  const resetStats = useCallback(() => {
    setMeetings(new Map());
    setGlobalTotalBytes({ inbound: 0, outbound: 0 });
    console.log('📊 [GLOBAL] Reset all bandwidth stats');
  }, []);

  // Calculate global stats using useMemo to prevent infinite loops
  const calculatedStats = useMemo(() => {
    const activeMeetings = Array.from(meetings.values()).filter(meeting => meeting.isActive);
    const allMeetings = Array.from(meetings.values());
    
    // Debug logging - always log to help with debugging
    console.log(`📊 [GLOBAL] Total meetings registered: ${allMeetings.length}, Active with bandwidth: ${activeMeetings.length}`);
    
    if (allMeetings.length > 0) {
      allMeetings.forEach(meeting => {
        console.log(`📊 [GLOBAL] Meeting ${meeting.meetingId.slice(0, 8)}: ${meeting.participantCount} participants, active: ${meeting.isActive}, bandwidth: ${meeting.stats.inbound + meeting.stats.outbound} bps, last updated: ${Math.floor((Date.now() - meeting.lastUpdated) / 1000)}s ago`);
      });
    } else {
      console.log(`📊 [GLOBAL] No meetings registered yet. Check if useMeetingBandwidthReporter is being called.`);
    }
    
    const totalInboundBps = activeMeetings.reduce((sum, meeting) => sum + meeting.stats.inbound, 0);
    const totalOutboundBps = activeMeetings.reduce((sum, meeting) => sum + meeting.stats.outbound, 0);
    const totalParticipants = activeMeetings.reduce((sum, meeting) => sum + meeting.participantCount, 0);
    const totalMeetings = activeMeetings.length;
    const totalBandwidthBps = totalInboundBps + totalOutboundBps;
    const averageBandwidthPerParticipant = totalParticipants > 0 ? totalBandwidthBps / totalParticipants : 0;

    return {
      totalMeetings,
      totalParticipants,
      totalInboundBps,
      totalOutboundBps,
      totalBandwidthBps,
      totalInboundBytes: globalTotalBytes.inbound,
      totalOutboundBytes: globalTotalBytes.outbound,
      averageBandwidthPerParticipant,
      meetings: new Map(meetings)
    };
  }, [meetings, globalTotalBytes]);

  // Update global stats when calculated stats change
  useEffect(() => {
    setGlobalStats(calculatedStats);
  }, [calculatedStats]);

  // Accumulate total bytes consumed and clean up inactive meetings
  useEffect(() => {
    if (!isMonitoring) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      
      setMeetings(prev => {
        const newMeetings = new Map(prev);
        let totalInboundDelta = 0;
        let totalOutboundDelta = 0;
        
        // Mark meetings as inactive if not updated recently (30 seconds)
        for (const [meetingId, meeting] of newMeetings) {
          if (now - meeting.lastUpdated > 30000) {
            newMeetings.set(meetingId, { ...meeting, isActive: false });
            console.log(`📊 [GLOBAL] Meeting ${meetingId} marked as inactive`);
          } else if (meeting.isActive) {
            // Accumulate bandwidth consumption (approximate)
            totalInboundDelta += meeting.stats.inbound;
            totalOutboundDelta += meeting.stats.outbound;
          }
        }
        
        // Update global total bytes
        if (totalInboundDelta > 0 || totalOutboundDelta > 0) {
          setGlobalTotalBytes(prev => ({
            inbound: prev.inbound + totalInboundDelta,
            outbound: prev.outbound + totalOutboundDelta
          }));
        }
        
        return newMeetings;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isMonitoring]);

  const value: GlobalBandwidthContextType = {
    globalStats,
    registerMeeting,
    unregisterMeeting,
    updateMeetingStats,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetStats
  };

  return (
    <GlobalBandwidthContext.Provider value={value}>
      {children}
    </GlobalBandwidthContext.Provider>
  );
}

export function useGlobalBandwidth() {
  const context = useContext(GlobalBandwidthContext);
  if (!context) {
    throw new Error('useGlobalBandwidth must be used within GlobalBandwidthProvider');
  }
  return context;
}