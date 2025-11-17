'use client';

import { getLiveMeetingsApi, getPublicMeetingParticipantsApi, IMeeting } from '@/api/meeting.rest';

export interface LiveMeetingBandwidthData {
  meetingId: string;
  meetingTitle: string;
  participantCount: number;
  status: 'live';
  lastUpdated: number;
  // Bandwidth will be populated from WebRTC connections
  realBandwidth?: {
    inbound: number;
    outbound: number;
    total: number;
    formatted: {
      inbound: string;
      outbound: string;
      total: string;
    };
  };
}

export interface LiveMeetingsBandwidthStats {
  totalLiveMeetings: number;
  totalParticipants: number;
  totalBandwidth: number;
  meetings: LiveMeetingBandwidthData[];
  lastFetched: number;
}

class LiveMeetingsBandwidthService {
  private liveMeetings: Map<string, LiveMeetingBandwidthData> = new Map();
  private listeners: Set<(stats: LiveMeetingsBandwidthStats) => void> = new Set();
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Fetch live meetings from API
  async fetchLiveMeetings(): Promise<LiveMeetingBandwidthData[]> {
    try {
      console.log('🔄 [LIVE-SERVICE] Fetching live meetings from API...');
      
      const liveMeetingsFromAPI = await getLiveMeetingsApi();
      console.log(`📊 [LIVE-SERVICE] Found ${liveMeetingsFromAPI.length} live meetings`);

      const meetingDataPromises = liveMeetingsFromAPI.map(async (meeting: IMeeting): Promise<LiveMeetingBandwidthData> => {
        try {
          // Get participant count for each meeting
          const participants = await getPublicMeetingParticipantsApi(meeting.id);
          
          return {
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            participantCount: participants.length,
            status: 'live' as const,
            lastUpdated: Date.now(),
            // realBandwidth will be populated by registerBandwidthData
          };
        } catch (error) {
          console.warn(`⚠️ [LIVE-SERVICE] Failed to get participants for meeting ${meeting.id}:`, error);
          return {
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            participantCount: 0,
            status: 'live' as const,
            lastUpdated: Date.now(),
          };
        }
      });

      const meetingData = await Promise.all(meetingDataPromises);
      
      // Update internal map
      this.liveMeetings.clear();
      meetingData.forEach(meeting => {
        this.liveMeetings.set(meeting.meetingId, meeting);
      });

      console.log(`📊 [LIVE-SERVICE] Updated ${meetingData.length} live meetings in cache`);
      return meetingData;
      
    } catch (error) {
      console.error('❌ [LIVE-SERVICE] Error fetching live meetings:', error);
      return [];
    }
  }

  // Register real bandwidth data from WebRTC connections
  registerBandwidthData(meetingId: string, bandwidthData: {
    inbound: number;
    outbound: number;
    inboundFormatted: string;
    outboundFormatted: string;
  }) {
    console.log(`📊 [LIVE-SERVICE] Attempting to register bandwidth for ${meetingId.slice(0, 8)}:`, bandwidthData);
    console.log(`📊 [LIVE-SERVICE] Available meetings in cache:`, Array.from(this.liveMeetings.keys()).map(id => id.slice(0, 8)));
    
    const meeting = this.liveMeetings.get(meetingId);
    if (meeting) {
      const total = bandwidthData.inbound + bandwidthData.outbound;
      
      meeting.realBandwidth = {
        inbound: bandwidthData.inbound,
        outbound: bandwidthData.outbound,
        total: total,
        formatted: {
          inbound: bandwidthData.inboundFormatted,
          outbound: bandwidthData.outboundFormatted,
          total: this.formatBytes(total) + '/s'
        }
      };
      meeting.lastUpdated = Date.now();
      
      console.log(`📊 [LIVE-SERVICE] ✅ Successfully updated bandwidth for meeting ${meetingId.slice(0, 8)}: ${bandwidthData.inboundFormatted} down, ${bandwidthData.outboundFormatted} up`);
      
      // Notify listeners
      this.notifyListeners();
    } else {
      console.log(`📊 [LIVE-SERVICE] ❌ Meeting ${meetingId.slice(0, 8)} not found in live meetings cache. Meeting may not have status='live' or service not started.`);
    }
  }

  // Add listener for stats updates
  addListener(callback: (stats: LiveMeetingsBandwidthStats) => void) {
    this.listeners.add(callback);
    
    // Immediately send current stats
    callback(this.getAggregatedStats());
  }

  // Remove listener
  removeListener(callback: (stats: LiveMeetingsBandwidthStats) => void) {
    this.listeners.delete(callback);
  }

  // Get aggregated stats
  private getAggregatedStats(): LiveMeetingsBandwidthStats {
    const meetings = Array.from(this.liveMeetings.values());
    const totalParticipants = meetings.reduce((sum, meeting) => sum + meeting.participantCount, 0);
    const totalBandwidth = meetings.reduce((sum, meeting) => sum + (meeting.realBandwidth?.total || 0), 0);

    return {
      totalLiveMeetings: meetings.length,
      totalParticipants,
      totalBandwidth,
      meetings: meetings.filter(m => m.participantCount > 0), // Only show meetings with participants
      lastFetched: Date.now()
    };
  }

  // Notify all listeners
  private notifyListeners() {
    const stats = this.getAggregatedStats();
    this.listeners.forEach(callback => callback(stats));
  }

  // Start periodic fetching
  start(intervalMs: number = 10000) { // Default 10 seconds
    if (this.isRunning) {
      console.log('🔄 [LIVE-SERVICE] Service already running');
      return;
    }

    console.log(`🚀 [LIVE-SERVICE] Starting live meetings bandwidth service (interval: ${intervalMs}ms)`);
    this.isRunning = true;

    // Fetch immediately
    this.fetchLiveMeetings().then(() => {
      this.notifyListeners();
    });

    // Set up interval
    this.intervalId = setInterval(async () => {
      await this.fetchLiveMeetings();
      this.notifyListeners();
    }, intervalMs);
  }

  // Stop periodic fetching
  stop() {
    if (!this.isRunning) return;

    console.log('🛑 [LIVE-SERVICE] Stopping live meetings bandwidth service');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Utility: Format bytes
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get current live meetings
  getLiveMeetings(): LiveMeetingBandwidthData[] {
    return Array.from(this.liveMeetings.values());
  }

  // Check if meeting exists in live meetings
  hasLiveMeeting(meetingId: string): boolean {
    return this.liveMeetings.has(meetingId);
  }
}

// Singleton instance
export const liveMeetingsBandwidthService = new LiveMeetingsBandwidthService();