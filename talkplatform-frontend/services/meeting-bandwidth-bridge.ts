'use client';

// Simple bridge to collect bandwidth data from meetings and send to admin
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

class MeetingBandwidthBridge {
  private activeMeetings = new Map<string, MeetingBandwidthData>();
  private listeners = new Set<(meetings: MeetingBandwidthData[]) => void>();

  // Register a meeting
  registerMeeting(meetingId: string, meetingTitle: string) {
    if (!this.activeMeetings.has(meetingId)) {
      this.activeMeetings.set(meetingId, {
        meetingId,
        meetingTitle,
        participantCount: 0,
        bandwidth: {
          inbound: 0,
          outbound: 0,
          inboundFormatted: '0 B/s',
          outboundFormatted: '0 B/s',
          total: 0,
          totalFormatted: '0 B/s'
        },
        lastUpdated: Date.now()
      });
      console.log(`🌉 [BRIDGE] Registered meeting ${meetingId.slice(0, 8)} - ${meetingTitle}`);
      this.notifyListeners();
    }
  }

  // Update bandwidth for a meeting
  updateBandwidth(meetingId: string, bandwidthData: {
    inbound: number;
    outbound: number;
    inboundFormatted: string;
    outboundFormatted: string;
  }, participantCount: number) {
    const meeting = this.activeMeetings.get(meetingId);
    if (meeting) {
      const total = bandwidthData.inbound + bandwidthData.outbound;
      
      meeting.bandwidth = {
        ...bandwidthData,
        total,
        totalFormatted: this.formatBytes(total) + '/s'
      };
      meeting.participantCount = participantCount;
      meeting.lastUpdated = Date.now();

      console.log(`🌉 [BRIDGE] Updated ${meetingId.slice(0, 8)}: ${bandwidthData.inboundFormatted} ↓ ${bandwidthData.outboundFormatted} ↑ (${participantCount} users)`);
      this.notifyListeners();
    }
  }

  // Unregister a meeting
  unregisterMeeting(meetingId: string) {
    if (this.activeMeetings.delete(meetingId)) {
      console.log(`🌉 [BRIDGE] Unregistered meeting ${meetingId.slice(0, 8)}`);
      this.notifyListeners();
    }
  }

  // Get all active meetings
  getActiveMeetings(): MeetingBandwidthData[] {
    return Array.from(this.activeMeetings.values());
  }

  // Get aggregated stats
  getAggregatedStats() {
    const meetings = this.getActiveMeetings();
    const totalMeetings = meetings.length;
    const totalParticipants = meetings.reduce((sum, m) => sum + m.participantCount, 0);
    const totalInbound = meetings.reduce((sum, m) => sum + m.bandwidth.inbound, 0);
    const totalOutbound = meetings.reduce((sum, m) => sum + m.bandwidth.outbound, 0);
    const totalBandwidth = totalInbound + totalOutbound;

    return {
      totalMeetings,
      totalParticipants,
      totalInbound,
      totalOutbound,
      totalBandwidth,
      meetings
    };
  }

  // Add listener for updates
  addListener(callback: (meetings: MeetingBandwidthData[]) => void) {
    this.listeners.add(callback);
    // Send current data immediately
    callback(this.getActiveMeetings());
  }

  // Remove listener
  removeListener(callback: (meetings: MeetingBandwidthData[]) => void) {
    this.listeners.delete(callback);
  }

  // Notify all listeners
  private notifyListeners() {
    const meetings = this.getActiveMeetings();
    this.listeners.forEach(callback => callback(meetings));
  }

  // Utility: Format bytes
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Clean up inactive meetings (older than 30 seconds)
  cleanup() {
    const now = Date.now();
    const threshold = 30000; // 30 seconds

    for (const [meetingId, meeting] of this.activeMeetings) {
      if (now - meeting.lastUpdated > threshold) {
        console.log(`🌉 [BRIDGE] Auto-removed inactive meeting ${meetingId.slice(0, 8)}`);
        this.activeMeetings.delete(meetingId);
      }
    }
    this.notifyListeners();
  }
}

// Singleton bridge instance
export const meetingBandwidthBridge = new MeetingBandwidthBridge();

// Auto-cleanup every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    meetingBandwidthBridge.cleanup();
  }, 30000);
}