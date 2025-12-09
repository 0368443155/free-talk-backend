"use client";

import { useState, useEffect, useCallback } from 'react';
import { IMeetingParticipant } from '@/api/meeting.rest';
import { 
  getMeetingParticipantsApi, 
  getPublicMeetingParticipantsApi,
  kickParticipantApi,
  kickPublicMeetingParticipantApi,
  blockPublicMeetingParticipantApi,
  muteParticipantApi,
  mutePublicMeetingParticipantApi,
} from '@/api/meeting.rest';
import { useToast } from '@/components/ui/use-toast';

interface UseMeetingParticipantsProps {
  meetingId: string;
  isPublicMeeting: boolean;
  classroomId?: string;
}

interface UseMeetingParticipantsReturn {
  participants: IMeetingParticipant[];
  setParticipants: React.Dispatch<React.SetStateAction<IMeetingParticipant[]>>;
  participantsFetched: boolean;
  setParticipantsFetched: React.Dispatch<React.SetStateAction<boolean>>;
  fetchParticipants: () => Promise<void>;
  handleKickParticipant: (participantId: string, participantName: string) => Promise<void>;
  handleBlockParticipant: (participantId: string, participantName: string) => Promise<void>;
  handleMuteParticipant: (participantId: string, participantUserId: string) => Promise<void>;
  handleVideoOffParticipant: (participantId: string, participantUserId: string) => Promise<void>;
}

/**
 * Shared hook for meeting participants management
 * Used by both Traditional Meeting and LiveKit Meeting
 */
export function useMeetingParticipants({
  meetingId,
  isPublicMeeting,
  classroomId,
}: UseMeetingParticipantsProps): UseMeetingParticipantsReturn {
  const [participants, setParticipants] = useState<IMeetingParticipant[]>([]);
  const [participantsFetched, setParticipantsFetched] = useState(false);
  const { toast } = useToast();

  // Fetch participants from API
  const fetchParticipants = useCallback(async () => {
    try {
      const data = isPublicMeeting
        ? await getPublicMeetingParticipantsApi(meetingId)
        : await getMeetingParticipantsApi(classroomId!, meetingId);
      setParticipants(data);
      setParticipantsFetched(true);
    } catch (error: any) {
      console.error("Failed to fetch participants:", error);
      // Don't set participantsFetched to true on timeout - allow retry
      // Only set to true if it's a non-timeout error
      if (error.code !== 'ECONNABORTED' && !error.message?.includes('timeout')) {
        setParticipantsFetched(true);
      }
      // Silently fail for timeout errors - will retry on next poll
    }
  }, [meetingId, isPublicMeeting, classroomId]);

  // Kick participant
  const handleKickParticipant = useCallback(async (participantId: string, participantName: string) => {
    try {
      if (isPublicMeeting) {
        await kickPublicMeetingParticipantApi(meetingId, participantId);
      } else {
        await kickParticipantApi(classroomId!, meetingId, participantId);
      }
      toast({
        title: "Participant Kicked",
        description: `${participantName} has been removed from the meeting.`,
        variant: "default",
      });
      await fetchParticipants();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to kick participant",
        variant: "destructive",
      });
    }
  }, [meetingId, isPublicMeeting, classroomId, fetchParticipants, toast]);

  // Block participant
  const handleBlockParticipant = useCallback(async (participantId: string, participantName: string) => {
    try {
      if (isPublicMeeting) {
        await blockPublicMeetingParticipantApi(meetingId, participantId);
      }
      toast({
        title: "Participant Blocked",
        description: `${participantName} has been blocked from the meeting.`,
        variant: "default",
      });
      await fetchParticipants();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block participant",
        variant: "destructive",
      });
    }
  }, [meetingId, isPublicMeeting, fetchParticipants, toast]);

  // Mute participant - This is handled via socket events in meeting-room.tsx
  // This function is kept for API compatibility but actual control is via socket
  const handleMuteParticipant = useCallback(async (participantId: string, participantUserId: string) => {
    // Note: Actual mute/unmute is handled via socket events (admin:mute-user)
    // This function is kept for backward compatibility
    console.log('Mute participant (handled via socket):', participantId, participantUserId);
  }, []);

  // Video off participant - This is handled via socket events in meeting-room.tsx
  const handleVideoOffParticipant = useCallback(async (participantId: string, participantUserId: string) => {
    // Note: Actual video off/on is handled via socket events (admin:video-off-user)
    // This function is kept for backward compatibility
    console.log('Video off participant (handled via socket):', participantId, participantUserId);
  }, []);

  return {
    participants,
    setParticipants,
    participantsFetched,
    setParticipantsFetched,
    fetchParticipants,
    handleKickParticipant,
    handleBlockParticipant,
    handleMuteParticipant,
    handleVideoOffParticipant,
  };
}

