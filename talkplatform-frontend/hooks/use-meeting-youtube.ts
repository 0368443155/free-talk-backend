"use client";

import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseMeetingYouTubeProps {
  socket?: Socket | null;
  initialVideoId?: string | null;
  initialIsPlaying?: boolean;
  initialCurrentTime?: number;
}

interface UseMeetingYouTubeReturn {
  youtubeVideoId: string | null;
  youtubeIsPlaying: boolean;
  youtubeCurrentTime: number;
  setYoutubeVideoId: (id: string | null) => void;
  setYoutubeIsPlaying: (playing: boolean) => void;
  setYoutubeCurrentTime: (time: number) => void;
  handleYouTubeSync: (data: { videoId: string; currentTime: number; isPlaying: boolean }) => void;
  handleYouTubePlay: (data: { videoId?: string; currentTime: number }) => void;
  handleYouTubePause: (data: { currentTime: number }) => void;
  handleYouTubeSeek: (data: { currentTime: number }) => void;
  handleYouTubeClear: () => void;
}

/**
 * Shared hook for YouTube player synchronization via Socket.IO
 * Used by both Traditional Meeting and LiveKit Meeting
 */
export function useMeetingYouTube({
  socket = null,
  initialVideoId = null,
  initialIsPlaying = false,
  initialCurrentTime = 0,
}: UseMeetingYouTubeProps = {}): UseMeetingYouTubeReturn {
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(initialVideoId);
  const [youtubeIsPlaying, setYoutubeIsPlaying] = useState<boolean>(initialIsPlaying);
  const [youtubeCurrentTime, setYoutubeCurrentTime] = useState<number>(initialCurrentTime);

  const handleYouTubeSync = useCallback((data: { videoId: string; currentTime: number; isPlaying: boolean }) => {
    setYoutubeVideoId(data.videoId || null);
    setYoutubeCurrentTime(typeof data.currentTime === "number" ? data.currentTime : 0);
    setYoutubeIsPlaying(!!data.isPlaying);
  }, []);

  const handleYouTubePlay = useCallback((data: { videoId?: string; currentTime: number }) => {
    if (data.videoId) {
      setYoutubeVideoId(data.videoId);
    }
    if (typeof data.currentTime === "number") {
      setYoutubeCurrentTime(data.currentTime);
    }
    setYoutubeIsPlaying(true);
  }, []);

  const handleYouTubePause = useCallback((data: { currentTime: number }) => {
    if (typeof data.currentTime === "number") {
      setYoutubeCurrentTime(data.currentTime);
    }
    setYoutubeIsPlaying(false);
  }, []);

  const handleYouTubeSeek = useCallback((data: { currentTime: number }) => {
    if (typeof data.currentTime === "number") {
      setYoutubeCurrentTime(data.currentTime);
    }
  }, []);

  const handleYouTubeClear = useCallback(() => {
    setYoutubeVideoId(null);
    setYoutubeIsPlaying(false);
    setYoutubeCurrentTime(0);
  }, []);

  // Setup socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("youtube:sync", handleYouTubeSync);
    socket.on("youtube:play", handleYouTubePlay);
    socket.on("youtube:pause", handleYouTubePause);
    socket.on("youtube:seek", handleYouTubeSeek);
    socket.on("youtube:clear", handleYouTubeClear);

    return () => {
      socket.off("youtube:sync", handleYouTubeSync);
      socket.off("youtube:play", handleYouTubePlay);
      socket.off("youtube:pause", handleYouTubePause);
      socket.off("youtube:seek", handleYouTubeSeek);
      socket.off("youtube:clear", handleYouTubeClear);
    };
  }, [socket, handleYouTubeSync, handleYouTubePlay, handleYouTubePause, handleYouTubeSeek, handleYouTubeClear]);

  return {
    youtubeVideoId,
    youtubeIsPlaying,
    youtubeCurrentTime,
    setYoutubeVideoId,
    setYoutubeIsPlaying,
    setYoutubeCurrentTime,
    handleYouTubeSync,
    handleYouTubePlay,
    handleYouTubePause,
    handleYouTubeSeek,
    handleYouTubeClear,
  };
}

