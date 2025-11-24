"use client";

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { joinMeetingApi, joinPublicMeetingApi } from '@/api/meeting.rest';
import { generateLiveKitTokenApi } from '@/api/livekit.rest';
import { DeviceSettings } from '@/components/meeting/green-room';

interface UseMeetingJoinOptions {
  meetingId: string;
  isPublicMeeting: boolean;
  classroomId?: string;
  onJoinSuccess?: (token: string, wsUrl: string, deviceSettings: DeviceSettings) => void;
  onJoinError?: (error: any) => void;
}

/**
 * Hook to handle meeting join logic (both traditional and LiveKit)
 * Handles joining meeting API and LiveKit token generation
 */
export function useMeetingJoin({
  meetingId,
  isPublicMeeting,
  classroomId,
  onJoinSuccess,
  onJoinError,
}: UseMeetingJoinOptions) {
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();

  const joinMeeting = useCallback(async (deviceSettings: DeviceSettings) => {
    if (isJoining) {
      console.log('⏳ Join already in progress');
      return;
    }

    try {
      setIsJoining(true);
      console.log('📝 Joining meeting with deviceSettings:', {
        audioEnabled: deviceSettings.audioEnabled,
        videoEnabled: deviceSettings.videoEnabled
      });
      
      // First, join meeting with deviceSettings to sync state in database
      if (isPublicMeeting) {
        await joinPublicMeetingApi(meetingId, {
          audioEnabled: deviceSettings.audioEnabled,
          videoEnabled: deviceSettings.videoEnabled
        });
      } else {
        await joinMeetingApi(classroomId!, meetingId, {
          audioEnabled: deviceSettings.audioEnabled,
          videoEnabled: deviceSettings.videoEnabled
        });
      }
      
      console.log('✅ Meeting joined, state synced to database');
      
      // Then request LiveKit token
      console.log('🔐 Requesting LiveKit token for meeting:', meetingId);
      const data = await generateLiveKitTokenApi(meetingId);
      
      if (!data || !data.token || !data.wsUrl) {
        throw new Error('Invalid token response from server');
      }
      
      console.log('✅ LiveKit token received successfully');
      
      // Call success callback
      if (onJoinSuccess) {
        onJoinSuccess(data.token, data.wsUrl, deviceSettings);
      }
      
      return { token: data.token, wsUrl: data.wsUrl };
    } catch (error: any) {
      console.error("❌ Failed to join meeting:", error);
      
      // Extract error message
      let errorMessage = "Failed to join meeting. Could not generate token.";
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400) {
          errorMessage = data?.message || "Invalid request. Please check your meeting ID.";
        } else if (status === 401) {
          errorMessage = "Authentication failed. Please log in again.";
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setTimeout(() => window.location.href = '/login', 2000);
          }
        } else if (status === 403) {
          errorMessage = data?.message || "Access denied. You may not have permission to join this meeting.";
        } else if (status === 404) {
          errorMessage = "Meeting not found. Please check the meeting ID.";
        } else {
          errorMessage = data?.message || `Server error (${status}). Please try again later.`;
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your internet connection.";
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      if (onJoinError) {
        onJoinError(error);
      }
      
      throw error;
    } finally {
      setIsJoining(false);
    }
  }, [meetingId, isPublicMeeting, classroomId, isJoining, onJoinSuccess, onJoinError, toast]);

  return {
    joinMeeting,
    isJoining,
  };
}

