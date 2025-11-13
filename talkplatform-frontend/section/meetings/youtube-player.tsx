"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface YouTubePlayerProps {
  socket: Socket | null;
  isHost: boolean;
  initialVideoId?: string;
  initialCurrentTime?: number;
  initialIsPlaying?: boolean;
  volume?: number;
}

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Export control methods for external use
export interface YouTubePlayerHandle {
  handleTogglePlay: () => void;
  handleSelectVideo: (videoId: string, startSeconds?: number) => void;
  handleClearVideo: () => void;
  handleVolumeChange: (volume: number[]) => void;
  handleToggleMute: () => void;
  getCurrentTime: () => number;
  getState: () => {
    videoId: string | null;
    currentTime: number;
    isPlaying: boolean;
  };
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(function YouTubePlayer(
  {
    socket,
    isHost,
    initialVideoId,
    initialCurrentTime = 0,
    initialIsPlaying = false,
    volume: externalVolume = 50,
  }: YouTubePlayerProps,
  ref
) {
  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const currentVideoIdRef = useRef<string>("");
  const isUpdatingRef = useRef(false);

  console.log("🎬 [YouTubePlayer] Render:", {
    initialVideoId,
    initialCurrentTime,
    initialIsPlaying,
    isPlayerReady,
  });

  // Get current time from player
  const getCurrentTime = () => {
    if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
      return playerRef.current.getCurrentTime();
    }
    return initialCurrentTime;
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      initPlayer();
      return;
    }

    // Load API script
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // API ready callback
    window.onYouTubeIframeAPIReady = () => {
      console.log("✅ YouTube IFrame API ready");
      initPlayer();
    };

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
      }
      setIsPlayerReady(false);
    };
  }, []);

  const initPlayer = () => {
    if (!playerDivRef.current || !window.YT || !window.YT.Player) {
      console.error("❌ Cannot initialize player");
      return;
    }

    console.log("🎬 Initializing YouTube player");

    try {
      playerRef.current = new window.YT.Player(playerDivRef.current, {
        height: "100%",
        width: "100%",
        videoId: initialVideoId || undefined,
        playerVars: {
          autoplay: 0,
          controls: isHost ? 1 : 0,
          disablekb: isHost ? 0 : 1,
          modestbranding: 1,
          rel: 0,
          fs: isHost ? 1 : 0,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
      console.log("✅ YouTube Player instance created");
    } catch (error) {
      console.error("❌ Failed to create YouTube Player:", error);
    }
  };

  const onPlayerReady = (event: any) => {
    console.log("✅ YouTube player ready");
    event.target.setVolume(externalVolume);
    setIsPlayerReady(true);
  };

  const onPlayerStateChange = (event: any) => {
    const state = event.data;
    console.log("🎬 Player state changed:", state);

    // Only emit events if this is host's action
    if (isHost && socket) {
      const currentTime = event.target.getCurrentTime();
      const videoData = event.target.getVideoData();
      const videoId = videoData?.video_id;

      if (state === window.YT.PlayerState.PLAYING) {
        console.log("▶️ Emitting youtube:play");
        socket.emit("youtube:play", {
          videoId: videoId,
          currentTime,
        });
      } else if (state === window.YT.PlayerState.PAUSED) {
        console.log("⏸️ Emitting youtube:pause");
        socket.emit("youtube:pause", {
          currentTime,
        });
      }
    }
  };

  // Handle prop changes from parent (meeting-room)
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current || isUpdatingRef.current) return;

    const player = playerRef.current;
    const videoId = initialVideoId || "";
    const currentTime = initialCurrentTime || 0;
    const isPlaying = initialIsPlaying || false;

    console.log("🔄 Props changed:", {
      videoId,
      currentTime,
      isPlaying,
      currentVideoIdRef: currentVideoIdRef.current,
    });

    // Case 1: Clear video
    if (!videoId && currentVideoIdRef.current) {
      console.log("❌ Clearing video");
      if (typeof player.stopVideo === "function") {
        player.stopVideo();
      }
      currentVideoIdRef.current = "";
      return;
    }

    // Case 2: New video
    if (videoId && videoId !== currentVideoIdRef.current) {
      console.log("🎬 Loading new video:", videoId);
      isUpdatingRef.current = true;

      if (typeof player.loadVideoById === "function") {
        player.loadVideoById({
          videoId: videoId,
          startSeconds: currentTime,
        });

        // Wait for video to load, then play/pause accordingly
        setTimeout(() => {
          if (isPlaying && typeof player.playVideo === "function") {
            player.playVideo();
          } else if (!isPlaying && typeof player.pauseVideo === "function") {
            player.pauseVideo();
          }
          currentVideoIdRef.current = videoId;
          isUpdatingRef.current = false;
        }, 500);
      }
      return;
    }

    // Case 3: Same video, different play state
    if (videoId === currentVideoIdRef.current) {
      const playerState = typeof player.getPlayerState === "function" ? player.getPlayerState() : -1;

      if (isPlaying && playerState !== window.YT.PlayerState.PLAYING) {
        console.log("▶️ Playing video");
        if (typeof player.seekTo === "function") {
          player.seekTo(currentTime, true);
        }
        if (typeof player.playVideo === "function") {
          player.playVideo();
        }
      } else if (!isPlaying && playerState === window.YT.PlayerState.PLAYING) {
        console.log("⏸️ Pausing video");
        if (typeof player.seekTo === "function") {
          player.seekTo(currentTime, true);
        }
        if (typeof player.pauseVideo === "function") {
          player.pauseVideo();
        }
      }
    }
  }, [initialVideoId, initialCurrentTime, initialIsPlaying, isPlayerReady]);

  // Sync volume from external control
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === "function") {
      playerRef.current.setVolume(externalVolume);
      console.log(`🔊 Volume synced to ${externalVolume}%`);
    }
  }, [externalVolume]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    handleTogglePlay: () => {
      if (!isHost || !playerRef.current) return;

      const currentTime = getCurrentTime();
      const playerState = typeof playerRef.current.getPlayerState === "function" 
        ? playerRef.current.getPlayerState() 
        : -1;

      if (playerState === window.YT.PlayerState.PLAYING) {
        console.log("⏸️ Host pausing video");
        if (typeof playerRef.current.pauseVideo === "function") {
          playerRef.current.pauseVideo();
        }
        if (socket) {
          socket.emit("youtube:pause", { currentTime });
        }
      } else {
        console.log("▶️ Host playing video");
        if (typeof playerRef.current.playVideo === "function") {
          playerRef.current.playVideo();
        }
        if (socket) {
          const videoData = playerRef.current.getVideoData?.();
          socket.emit("youtube:play", {
            videoId: videoData?.video_id,
            currentTime,
          });
        }
      }
    },

    handleSelectVideo: (videoId: string, startSeconds = 0) => {
      if (!isHost || !isPlayerReady || !playerRef.current) return;

      console.log("🔍 Loading video:", videoId, "at", startSeconds);
      isUpdatingRef.current = true;

      if (typeof playerRef.current.loadVideoById === "function") {
        playerRef.current.loadVideoById({
          videoId: videoId,
          startSeconds,
        });

        setTimeout(() => {
          if (playerRef.current && typeof playerRef.current.playVideo === "function") {
            playerRef.current.playVideo();
          }
          currentVideoIdRef.current = videoId;
          isUpdatingRef.current = false;
        }, 500);
      }

      if (socket) {
        socket.emit("youtube:play", {
          videoId: videoId,
          currentTime: startSeconds,
        });
      }
    },

    handleClearVideo: () => {
      if (!isHost || !playerRef.current) return;

      console.log("❌ Clearing video");
      if (typeof playerRef.current.stopVideo === "function") {
        playerRef.current.stopVideo();
      }
      currentVideoIdRef.current = "";

      if (socket) {
        socket.emit("youtube:clear");
      }
    },

    handleVolumeChange: (volume: number[]) => {
      if (!playerRef.current || typeof playerRef.current.setVolume !== "function") return;
      const [value] = volume;
      playerRef.current.setVolume(value);
    },

    handleToggleMute: () => {
      if (!playerRef.current) return;
      if (typeof playerRef.current.isMuted === "function" && playerRef.current.isMuted()) {
        if (typeof playerRef.current.unMute === "function") {
          playerRef.current.unMute();
        }
      } else if (typeof playerRef.current.mute === "function") {
        playerRef.current.mute();
      }
    },

    getCurrentTime: () => getCurrentTime(),

    getState: () => ({
      videoId: currentVideoIdRef.current || null,
      currentTime: getCurrentTime(),
      isPlaying: playerRef.current && typeof playerRef.current.getPlayerState === "function"
        ? playerRef.current.getPlayerState() === window.YT.PlayerState.PLAYING
        : false,
    }),
  }));

  // Render empty state if no video
  if (!initialVideoId) {
    console.log("📺 [YouTubePlayer] No video, showing empty state");
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          {isHost ? (
            <div className="text-gray-400">
              <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Use YouTube search to select a video</p>
            </div>
          ) : (
            <div className="text-gray-400">
              <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Waiting for host to start YouTube video...</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  console.log("📺 [YouTubePlayer] Rendering player:", { initialVideoId });

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm">
            YouTube Player {initialVideoId && `(${initialVideoId})`}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="aspect-video bg-black rounded overflow-hidden relative">
          <div ref={playerDivRef} className="w-full h-full" />
          {!isPlayerReady && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              Loading YouTube Player...
            </div>
          )}
          {/* Overlay to prevent participants from clicking on video */}
          {!isHost && (
            <div
              className="absolute inset-0 cursor-not-allowed z-10"
              style={{ pointerEvents: "auto" }}
              title="Only host can control video"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
});
