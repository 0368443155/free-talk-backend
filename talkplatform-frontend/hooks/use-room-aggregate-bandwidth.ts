'use client';

import { useState, useEffect } from 'react';
import { roomAggregateBandwidthService } from '@/services/room-aggregate-bandwidth-service';

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

export function useRoomAggregateBandwidth(enabled: boolean = false) {
  const [stats, setStats] = useState<AggregatedRoomStats>({
    totalRooms: 0,
    totalUsers: 0,
    totalBandwidth: 0,
    rooms: []
  });

  // Handle stats updates from service
  const handleStatsUpdate = (updatedStats: AggregatedRoomStats) => {
    console.log(`📊 [ROOM-AGGREGATE-HOOK] Received ${updatedStats.totalRooms} rooms with ${updatedStats.totalUsers} total users:`, updatedStats);
    setStats(updatedStats);

    if (updatedStats.totalRooms > 0) {
      const totalBandwidthKB = Math.round(updatedStats.totalBandwidth / 1024);
      console.log(`📊 [ROOM-AGGREGATE-HOOK] Total platform bandwidth: ${totalBandwidthKB} KB/s from ${updatedStats.totalUsers} users in ${updatedStats.totalRooms} rooms`);
      
      // Log each room's contribution
      updatedStats.rooms.forEach(room => {
        const roomBandwidthKB = Math.round(room.totalBandwidth.total / 1024);
        console.log(`📊 [ROOM-AGGREGATE-HOOK] Room ${room.meetingId.slice(0, 8)} (${room.meetingTitle}): ${roomBandwidthKB} KB/s from ${room.participantCount} users`);
      });
    }
  };

  // Subscribe/unsubscribe to service
  useEffect(() => {
    if (enabled) {
      console.log('📊 [ROOM-AGGREGATE-HOOK] Subscribing to room aggregate bandwidth service');
      
      // Initialize service
      roomAggregateBandwidthService.init();
      
      // Add listener
      roomAggregateBandwidthService.addListener(handleStatsUpdate);
      
      return () => {
        console.log('📊 [ROOM-AGGREGATE-HOOK] Unsubscribing from room aggregate bandwidth service');
        roomAggregateBandwidthService.removeListener(handleStatsUpdate);
      };
    } else {
      // Reset when disabled
      setStats({
        totalRooms: 0,
        totalUsers: 0,
        totalBandwidth: 0,
        rooms: []
      });
    }
  }, [enabled]);

  return {
    stats,
    // Expose service methods
    updateUserBandwidth: (
      meetingId: string,
      meetingTitle: string,
      userId: string,
      username: string,
      bandwidth: any
    ) => {
      roomAggregateBandwidthService.updateUserBandwidth(
        meetingId,
        meetingTitle,
        userId,
        username,
        bandwidth
      );
    },
    removeUserFromRoom: (meetingId: string, userId: string) => {
      roomAggregateBandwidthService.removeUserFromRoom(meetingId, userId);
    }
  };
}