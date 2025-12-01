"use client";

import { useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { YouTubePlayerHandle } from '@/section/meetings/youtube-player';

interface UseYouTubeControlsProps {
  socket: Socket | null;
  isHost: boolean;
  youtubePlayerRef: React.RefObject<YouTubePlayerHandle | null>;
  youtubeVideoId: string | null;
  youtubeIsPlaying: boolean;
  youtubeCurrentTime: number;
  setYoutubeVideoId: (videoId: string | null) => void;
  setYoutubeIsPlaying: (isPlaying: boolean) => void;
  setYoutubeCurrentTime: (time: number) => void;
  setShowVideoGrid?: (show: boolean) => void;
}

interface UseYouTubeControlsReturn {
  handleYoutubeSelectVideo: (videoId: string) => void;
  handleYoutubeTogglePlay: () => void;
  handleYoutubeClear: () => void;
  handleYoutubeMute: () => void;
}

/**
 * Shared hook for YouTube player controls
 * Reusable across LiveKit room and traditional meeting room
 */
export function useYouTubeControls({
  socket,
  isHost,
  youtubePlayerRef,
  youtubeVideoId,
  youtubeIsPlaying,
  youtubeCurrentTime,
  setYoutubeVideoId,
  setYoutubeIsPlaying,
  setYoutubeCurrentTime,
  setShowVideoGrid,
}: UseYouTubeControlsProps): UseYouTubeControlsReturn {
  
  const handleYoutubeSelectVideo = useCallback((videoId: string) => {
    if (!isHost) {
      console.warn("⚠️ handleYoutubeSelectVideo: Not a host, cannot select video");
      return;
    }

    console.log("🎬 Host selected video:", videoId);
    
    // Set video state FIRST (this will trigger re-render with new initialVideoId)
    setYoutubeVideoId(videoId);
    setYoutubeCurrentTime(0);
    setYoutubeIsPlaying(true);
    
    // Switch to YouTube player view so player is visible (if setShowVideoGrid is provided)
    if (setShowVideoGrid) {
      setShowVideoGrid(false);
    }

    // Broadcast to participants immediately
    if (socket?.connected) {
      socket.emit("youtube:play", {
        videoId,
        currentTime: 0,
      });
    }

    // Also call handleSelectVideo directly as backup (in case props update doesn't work)
    // This ensures video loads even if useEffect doesn't trigger
    setTimeout(() => {
      if (youtubePlayerRef.current) {
        console.log("🎬 Calling handleSelectVideo on player ref (backup)");
        youtubePlayerRef.current.handleSelectVideo(videoId, 0);
      }
    }, 200);
  }, [isHost, socket, setYoutubeVideoId, setYoutubeCurrentTime, setYoutubeIsPlaying, setShowVideoGrid, youtubePlayerRef]);

  const handleYoutubeTogglePlay = useCallback(() => {
    if (!isHost || !youtubeVideoId) return;

    console.log(`🎬 Toggle: ${youtubeIsPlaying ? 'Pause' : 'Play'} | VideoID: ${youtubeVideoId}`);

    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.handleTogglePlay();
    } else if (socket?.connected) {
      // Fallback: emit socket event if player ref is not available
      if (youtubeIsPlaying) {
        socket.emit("youtube:pause", {
          currentTime: youtubeCurrentTime,
        });
      } else {
        socket.emit("youtube:play", {
          videoId: youtubeVideoId,
          currentTime: youtubeCurrentTime,
        });
      }
    }

    setYoutubeIsPlaying(!youtubeIsPlaying);
  }, [isHost, youtubeVideoId, youtubeIsPlaying, youtubeCurrentTime, socket, youtubePlayerRef, setYoutubeIsPlaying]);

  const handleYoutubeClear = useCallback(() => {
    if (!isHost) return;

    console.log("❌ Host clearing video");
    setYoutubeVideoId(null);
    setYoutubeIsPlaying(false);
    setYoutubeCurrentTime(0);

    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.handleClearVideo();
    } else if (socket?.connected) {
      // Fallback: emit socket event if player ref is not available
      socket.emit("youtube:clear");
    }
  }, [isHost, socket, setYoutubeVideoId, setYoutubeIsPlaying, setYoutubeCurrentTime, youtubePlayerRef]);

  const handleYoutubeMute = useCallback(() => {
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.handleToggleMute();
    }
  }, [youtubePlayerRef]);

  return {
    handleYoutubeSelectVideo,
    handleYoutubeTogglePlay,
    handleYoutubeClear,
    handleYoutubeMute,
  };
}

