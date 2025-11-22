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
    } catch (error) {
      console.error("Failed to fetch participants:", error);
      setParticipantsFetched(true);
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

  // Mute participant
  const handleMuteParticipant = useCallback(async (participantId: string, participantUserId: string) => {
    try {
      if (isPublicMeeting) {
        await mutePublicMeetingParticipantApi(meetingId, participantId);
      } else {
        await muteParticipantApi(classroomId!, meetingId, participantId);
      }
      await fetchParticipants();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mute participant",
        variant: "destructive",
      });
    }
  }, [meetingId, isPublicMeeting, classroomId, fetchParticipants, toast]);

  // Video off participant (placeholder - actual implementation depends on meeting type)
  const handleVideoOffParticipant = useCallback(async (participantId: string, participantUserId: string) => {
    // This is handled differently in Traditional vs LiveKit
    // Traditional uses socket events, LiveKit uses API calls
    // Implementation will be in the respective components
    console.log('Video off participant:', participantId, participantUserId);
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

