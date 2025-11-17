'use client';

// Service to aggregate bandwidth from all users in a room
interface UserBandwidthData {
  userId: string;
  username?: string;
  bandwidth: {
    inbound: number;
    outbound: number;
    inboundFormatted: string;
    outboundFormatted: string;
  };
  lastUpdated: number;
}

interface RoomBandwidthData {
  meetingId: string;
  meetingTitle: string;
  users: Map<string, UserBandwidthData>;
  totalBandwidth: {
    inbound: number;
    outbound: number;
    total: number;
    inboundFormatted: string;
    outboundFormatted: string;
    totalFormatted: string;
  };
  participantCount: number;
  lastUpdated: number;
}

interface AggregatedRoomStats {
  totalRooms: number;
  totalUsers: number;
  totalBandwidth: number;
  rooms: RoomBandwidthData[];
}

const STORAGE_KEY = 'talkplatform_room_aggregate_bandwidth';
const USER_TIMEOUT = 30000; // 30 seconds - remove inactive users

class RoomAggregateBandwidthService {
  private listeners = new Set<(stats: AggregatedRoomStats) => void>();
  private isInitialized = false;

  // Initialize service
  init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    console.log('📊 [ROOM-AGGREGATE] Initializing room aggregate bandwidth service');
    
    // Listen for storage changes from other tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // Clean up inactive users periodically
    setInterval(() => {
      this.cleanup();
    }, 10000);
    
    this.isInitialized = true;
  }

  // Handle storage changes
  private handleStorageChange(event: StorageEvent) {
    if (event.key === STORAGE_KEY && event.newValue) {
      console.log('📊 [ROOM-AGGREGATE] Received update from another tab');
      this.notifyListeners();
    }
  }

  // Get current state from localStorage
  private getState(): Record<string, any> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('📊 [ROOM-AGGREGATE] Failed to parse localStorage data:', error);
    }
    return {};
  }

  // Save state to localStorage
  private setState(state: Record<string, any>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('📊 [ROOM-AGGREGATE] Failed to save to localStorage:', error);
    }
  }

  // Update user bandwidth in a room
  updateUserBandwidth(
    meetingId: string,
    meetingTitle: string,
    userId: string,
    username: string,
    bandwidth: {
      inbound: number;
      outbound: number;
      inboundFormatted: string;
      outboundFormatted: string;
    }
  ) {
    const state = this.getState();
    
    // Initialize room if not exists
    if (!state[meetingId]) {
      state[meetingId] = {
        meetingId,
        meetingTitle,
        users: {},
        lastUpdated: Date.now()
      };
    }

    // Update user data
    state[meetingId].users[userId] = {
      userId,
      username,
      bandwidth,
      lastUpdated: Date.now()
    };

    // Calculate room totals
    const room = state[meetingId];
    const users = Object.values(room.users) as UserBandwidthData[];
    
    const totalInbound = users.reduce((sum: number, user) => sum + user.bandwidth.inbound, 0);
    const totalOutbound = users.reduce((sum: number, user) => sum + user.bandwidth.outbound, 0);
    const totalBandwidth = totalInbound + totalOutbound;

    room.totalBandwidth = {
      inbound: totalInbound,
      outbound: totalOutbound,
      total: totalBandwidth,
      inboundFormatted: this.formatBytes(totalInbound) + '/s',
      outboundFormatted: this.formatBytes(totalOutbound) + '/s',
      totalFormatted: this.formatBytes(totalBandwidth) + '/s'
    };
    
    room.participantCount = users.length;
    room.lastUpdated = Date.now();

    this.setState(state);
    
    console.log(`📊 [ROOM-AGGREGATE] Updated ${meetingId.slice(0, 8)} - User ${username}: ${bandwidth.inboundFormatted} ↓ ${bandwidth.outboundFormatted} ↑`);
    console.log(`📊 [ROOM-AGGREGATE] Room total: ${room.totalBandwidth.inboundFormatted} ↓ ${room.totalBandwidth.outboundFormatted} ↑ (${room.participantCount} users)`);
    
    this.notifyListeners();
  }

  // Remove user from room
  removeUserFromRoom(meetingId: string, userId: string) {
    const state = this.getState();
    
    if (state[meetingId] && state[meetingId].users[userId]) {
      delete state[meetingId].users[userId];
      
      // Recalculate room totals
      const room = state[meetingId];
      const users = Object.values(room.users) as UserBandwidthData[];
      
      if (users.length === 0) {
        // Remove room if no users
        delete state[meetingId];
        console.log(`📊 [ROOM-AGGREGATE] Removed empty room ${meetingId.slice(0, 8)}`);
      } else {
        // Recalculate totals
        const totalInbound = users.reduce((sum: number, user) => sum + user.bandwidth.inbound, 0);
        const totalOutbound = users.reduce((sum: number, user) => sum + user.bandwidth.outbound, 0);
        const totalBandwidth = totalInbound + totalOutbound;

        room.totalBandwidth = {
          inbound: totalInbound,
          outbound: totalOutbound,
          total: totalBandwidth,
          inboundFormatted: this.formatBytes(totalInbound) + '/s',
          outboundFormatted: this.formatBytes(totalOutbound) + '/s',
          totalFormatted: this.formatBytes(totalBandwidth) + '/s'
        };
        
        room.participantCount = users.length;
        room.lastUpdated = Date.now();
        
        console.log(`📊 [ROOM-AGGREGATE] Removed user from ${meetingId.slice(0, 8)} - New total: ${room.totalBandwidth.totalFormatted} (${room.participantCount} users)`);
      }

      this.setState(state);
      this.notifyListeners();
    }
  }

  // Get all room data
  getAllRooms(): RoomBandwidthData[] {
    const state = this.getState();
    
    return Object.values(state).map((room: any) => ({
      meetingId: room.meetingId,
      meetingTitle: room.meetingTitle,
      users: new Map(Object.entries(room.users)),
      totalBandwidth: room.totalBandwidth,
      participantCount: room.participantCount,
      lastUpdated: room.lastUpdated
    }));
  }

  // Get aggregated stats across all rooms
  getAggregatedStats(): AggregatedRoomStats {
    const rooms = this.getAllRooms();
    
    const totalRooms = rooms.length;
    const totalUsers = rooms.reduce((sum, room) => sum + room.participantCount, 0);
    const totalBandwidth = rooms.reduce((sum, room) => sum + room.totalBandwidth.total, 0);

    return {
      totalRooms,
      totalUsers,
      totalBandwidth,
      rooms
    };
  }

  // Add listener
  addListener(callback: (stats: AggregatedRoomStats) => void) {
    this.listeners.add(callback);
    // Send current data immediately
    callback(this.getAggregatedStats());
  }

  // Remove listener
  removeListener(callback: (stats: AggregatedRoomStats) => void) {
    this.listeners.delete(callback);
  }

  // Notify listeners
  private notifyListeners() {
    const stats = this.getAggregatedStats();
    this.listeners.forEach(callback => callback(stats));
  }

  // Clean up inactive users
  private cleanup() {
    const state = this.getState();
    const now = Date.now();
    let hasChanges = false;

    for (const [meetingId, room] of Object.entries(state) as [string, any][]) {
      const users = room.users;
      
      for (const [userId, user] of Object.entries(users) as [string, any][]) {
        if (now - user.lastUpdated > USER_TIMEOUT) {
          delete users[userId];
          hasChanges = true;
          console.log(`📊 [ROOM-AGGREGATE] Auto-removed inactive user ${user.username} from ${meetingId.slice(0, 8)}`);
        }
      }

      // Remove room if no users left
      if (Object.keys(users).length === 0) {
        delete state[meetingId];
        hasChanges = true;
        console.log(`📊 [ROOM-AGGREGATE] Auto-removed empty room ${meetingId.slice(0, 8)}`);
      } else if (hasChanges) {
        // Recalculate totals for this room
        const activeUsers = Object.values(users) as UserBandwidthData[];
        const totalInbound = activeUsers.reduce((sum, user) => sum + user.bandwidth.inbound, 0);
        const totalOutbound = activeUsers.reduce((sum, user) => sum + user.bandwidth.outbound, 0);
        const totalBandwidth = totalInbound + totalOutbound;

        room.totalBandwidth = {
          inbound: totalInbound,
          outbound: totalOutbound,
          total: totalBandwidth,
          inboundFormatted: this.formatBytes(totalInbound) + '/s',
          outboundFormatted: this.formatBytes(totalOutbound) + '/s',
          totalFormatted: this.formatBytes(totalBandwidth) + '/s'
        };
        
        room.participantCount = activeUsers.length;
        room.lastUpdated = now;
      }
    }

    if (hasChanges) {
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
export const roomAggregateBandwidthService = new RoomAggregateBandwidthService();