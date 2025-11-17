'use client';

// Cross-tab bandwidth communication using localStorage
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

interface CrossTabBandwidthState {
  meetings: Record<string, CrossTabBandwidthData>;
  lastUpdated: number;
}

const STORAGE_KEY = 'talkplatform_bandwidth_data';
const CLEANUP_THRESHOLD = 30000; // 30 seconds

class CrossTabBandwidthService {
  private listeners = new Set<(meetings: CrossTabBandwidthData[]) => void>();
  private isInitialized = false;

  // Initialize service
  init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    console.log('🔄 [CROSS-TAB] Initializing cross-tab bandwidth service');
    
    // Listen for storage changes from other tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // Clean up old data periodically
    setInterval(() => {
      this.cleanup();
    }, 10000); // Cleanup every 10 seconds
    
    this.isInitialized = true;
  }

  // Handle storage changes from other tabs
  private handleStorageChange(event: StorageEvent) {
    if (event.key === STORAGE_KEY && event.newValue) {
      console.log('🔄 [CROSS-TAB] Received update from another tab');
      this.notifyListeners();
    }
  }

  // Get current state from localStorage
  private getState(): CrossTabBandwidthState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('🔄 [CROSS-TAB] Failed to parse localStorage data:', error);
    }
    
    return {
      meetings: {},
      lastUpdated: Date.now()
    };
  }

  // Save state to localStorage
  private setState(state: CrossTabBandwidthState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log(`🔄 [CROSS-TAB] Saved ${Object.keys(state.meetings).length} meetings to localStorage`);
    } catch (error) {
      console.warn('🔄 [CROSS-TAB] Failed to save to localStorage:', error);
    }
  }

  // Register/update a meeting
  updateMeeting(meetingId: string, meetingTitle: string, bandwidth: {
    inbound: number;
    outbound: number;
    inboundFormatted: string;
    outboundFormatted: string;
  }, participantCount: number) {
    const state = this.getState();
    const total = bandwidth.inbound + bandwidth.outbound;
    
    state.meetings[meetingId] = {
      meetingId,
      meetingTitle,
      participantCount,
      bandwidth: {
        ...bandwidth,
        total,
        totalFormatted: this.formatBytes(total) + '/s'
      },
      lastUpdated: Date.now()
    };
    
    state.lastUpdated = Date.now();
    this.setState(state);
    
    console.log(`🔄 [CROSS-TAB] Updated meeting ${meetingId.slice(0, 8)}: ${bandwidth.inboundFormatted} ↓ ${bandwidth.outboundFormatted} ↑`);
    
    // Notify local listeners immediately (for same tab)
    this.notifyListeners();
  }

  // Remove a meeting
  removeMeeting(meetingId: string) {
    const state = this.getState();
    if (state.meetings[meetingId]) {
      delete state.meetings[meetingId];
      state.lastUpdated = Date.now();
      this.setState(state);
      
      console.log(`🔄 [CROSS-TAB] Removed meeting ${meetingId.slice(0, 8)}`);
      this.notifyListeners();
    }
  }

  // Get all active meetings
  getAllMeetings(): CrossTabBandwidthData[] {
    const state = this.getState();
    return Object.values(state.meetings);
  }

  // Get aggregated stats
  getAggregatedStats() {
    const meetings = this.getAllMeetings();
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
  addListener(callback: (meetings: CrossTabBandwidthData[]) => void) {
    this.listeners.add(callback);
    // Send current data immediately
    callback(this.getAllMeetings());
  }

  // Remove listener
  removeListener(callback: (meetings: CrossTabBandwidthData[]) => void) {
    this.listeners.delete(callback);
  }

  // Notify all listeners
  private notifyListeners() {
    const meetings = this.getAllMeetings();
    this.listeners.forEach(callback => callback(meetings));
  }

  // Clean up old meetings
  private cleanup() {
    const state = this.getState();
    const now = Date.now();
    let hasChanges = false;
    
    for (const [meetingId, meeting] of Object.entries(state.meetings)) {
      if (now - meeting.lastUpdated > CLEANUP_THRESHOLD) {
        delete state.meetings[meetingId];
        hasChanges = true;
        console.log(`🔄 [CROSS-TAB] Auto-cleaned up old meeting ${meetingId.slice(0, 8)}`);
      }
    }
    
    if (hasChanges) {
      state.lastUpdated = now;
      this.setState(state);
      this.notifyListeners();
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
}

// Singleton instance
export const crossTabBandwidthService = new CrossTabBandwidthService();