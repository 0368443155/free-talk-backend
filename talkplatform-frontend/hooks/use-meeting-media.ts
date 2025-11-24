"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { IMeetingParticipant } from '@/api/meeting.rest';

/**
 * Hook to manage meeting media state (camera/mic) synchronized with database
 * Can be used in both traditional and LiveKit meeting rooms
 */
export function useMeetingMedia({
  currentParticipant,
  enableCamera,
  enableMicrophone,
  localParticipant,
}: {
  currentParticipant?: IMeetingParticipant | null;
  enableCamera?: (enabled: boolean) => Promise<void>;
  enableMicrophone?: (enabled: boolean) => Promise<void>;
  localParticipant?: any; // LiveKit LocalParticipant
}) {
  // Track mic/cam state from database (source of truth for UI sync)
  const [isMicEnabledState, setIsMicEnabledState] = useState(true);
  const [isCameraEnabledState, setIsCameraEnabledState] = useState(true);

  // Sync mic/cam state from database when participant data changes
  useEffect(() => {
    if (currentParticipant) {
      const dbIsMuted = (currentParticipant as any).is_muted ?? false;
      const dbIsVideoOff = (currentParticipant as any).is_video_off ?? false;
      
      setIsMicEnabledState(!dbIsMuted);
      setIsCameraEnabledState(!dbIsVideoOff);
      
      console.log('🔄 Synced participant state from database:', {
        isMuted: dbIsMuted,
        isVideoOff: dbIsVideoOff,
        isMicEnabled: !dbIsMuted,
        isCameraEnabled: !dbIsVideoOff
      });
    }
  }, [currentParticipant]);

  // Toggle camera
  const handleToggleCamera = useCallback(async () => {
    if (enableCamera && localParticipant) {
      const newState = !isCameraEnabledState;
      setIsCameraEnabledState(newState);
      await enableCamera(newState);
    }
  }, [isCameraEnabledState, enableCamera, localParticipant]);

  // Toggle microphone
  const handleToggleMicrophone = useCallback(async () => {
    if (enableMicrophone && localParticipant) {
      const newState = !isMicEnabledState;
      setIsMicEnabledState(newState);
      await enableMicrophone(newState);
    }
  }, [isMicEnabledState, enableMicrophone, localParticipant]);

  // Force update camera state (for host moderation)
  const forceCameraState = useCallback((enabled: boolean) => {
    setIsCameraEnabledState(enabled);
  }, []);

  // Force update mic state (for host moderation)
  const forceMicState = useCallback((enabled: boolean) => {
    setIsMicEnabledState(enabled);
  }, []);

  return {
    isMicEnabledState,
    isCameraEnabledState,
    handleToggleCamera,
    handleToggleMicrophone,
    forceCameraState,
    forceMicState,
    setIsMicEnabledState,
    setIsCameraEnabledState,
  };
}

