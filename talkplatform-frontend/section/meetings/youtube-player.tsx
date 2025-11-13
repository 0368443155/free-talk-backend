"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, Search, X, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";

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
  const [videoId, setVideoId] = useState(initialVideoId || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPlaying, setIsPlaying] = useState(initialIsPlaying);
  const [showSearch, setShowSearch] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(initialCurrentTime); // Save current position
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const isLocalChange = useRef(false);
  const timestampSyncInterval = useRef<NodeJS.Timeout | null>(null);
  const lastLoadedVideoId = useRef<string | null>(null);

  const getCurrentTime = () => {
    if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
      return playerRef.current.getCurrentTime();
    }
    return currentTimestamp;
  };

  // Sync timestamp periodically
  useEffect(() => {
    if (!playerRef.current || !videoId) return;

    // Update current timestamp every 1 second
    timestampSyncInterval.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime();
        setCurrentTimestamp(time);
      }
    }, 1000);

    return () => {
      if (timestampSyncInterval.current) {
        clearInterval(timestampSyncInterval.current);
      }
    };
  }, [videoId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !isPlayerReady) return;

    if (!videoId) {
      if (typeof player.stopVideo === "function") {
        player.stopVideo();
      }
      lastLoadedVideoId.current = null;
      return;
    }

    const currentVideoId =
      typeof player.getVideoData === "function" ? player.getVideoData()?.video_id : null;

    if (lastLoadedVideoId.current === videoId && currentVideoId === videoId) {
      return;
    }

    let loaded = false;

    if (typeof player.loadVideoById === "function") {
      player.loadVideoById({
        videoId,
        startSeconds: currentTimestamp ?? 0,
      });
      loaded = true;
    } else if (typeof player.cueVideoById === "function") {
      player.cueVideoById({
        videoId,
        startSeconds: currentTimestamp ?? 0,
      });
      loaded = true;
    }

    if (loaded && isPlaying && typeof player.playVideo === "function") {
      player.playVideo();
    } else if (loaded && !isPlaying && typeof player.pauseVideo === "function") {
      player.pauseVideo();
    }

    if (loaded) {
      lastLoadedVideoId.current = videoId;
    }

    if (!loaded) {
      lastLoadedVideoId.current = null;
    }
  }, [videoId, currentTimestamp, isPlaying, isPlayerReady]);

  useEffect(() => {
    if (isLocalChange.current) {
      isLocalChange.current = false;
      return;
    }

    const nextVideoId = initialVideoId || "";
    if (nextVideoId !== videoId) {
      setVideoId(nextVideoId);
      lastLoadedVideoId.current = nextVideoId;
      if (playerRef.current) {
        if (nextVideoId) {
          if (typeof playerRef.current.loadVideoById === "function") {
            playerRef.current.loadVideoById({
              videoId: nextVideoId,
              startSeconds: initialCurrentTime ?? 0,
            });
          }
        } else if (typeof playerRef.current.stopVideo === "function") {
          playerRef.current.stopVideo();
        }
      }
    }

    if (typeof initialCurrentTime === "number") {
      setCurrentTimestamp(initialCurrentTime);
      if (playerRef.current && typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(initialCurrentTime, true);
      }
    }

    setIsPlaying(initialIsPlaying);
    if (playerRef.current) {
      if (initialIsPlaying && typeof playerRef.current.playVideo === "function") {
        playerRef.current.playVideo();
      } else if (!initialIsPlaying && typeof playerRef.current.pauseVideo === "function") {
        playerRef.current.pauseVideo();
      }
    }
  }, [initialVideoId, initialCurrentTime, initialIsPlaying]);

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
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
      setIsPlayerReady(false);
    };
  }, []);

  const initPlayer = () => {
    if (!playerDivRef.current) {
      console.error("❌ playerDivRef.current is null");
      return;
    }
    
    if (!window.YT) {
      console.error("❌ window.YT is not loaded");
      return;
    }
    
    if (!window.YT.Player) {
      console.error("❌ window.YT.Player is not available");
      return;
    }

    console.log("🎬 Initializing YouTube player", { videoId, currentTimestamp });

    try {
      playerRef.current = new window.YT.Player(playerDivRef.current, {
        height: "100%",
        width: "100%",
        videoId: videoId || undefined,
        playerVars: {
          autoplay: isPlaying ? 1 : 0,
          start: Math.floor(currentTimestamp),
          controls: isHost ? 1 : 0, // Only host can see controls
          disablekb: isHost ? 0 : 1, // Disable keyboard controls for participants
          modestbranding: 1,
          rel: 0,
          fs: isHost ? 1 : 0, // Disable fullscreen for participants
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

  const loadAndBroadcastVideo = (
    newVideoId: string,
    startSeconds = 0,
    options: { closeSearch?: boolean } = {},
  ) => {
    if (!isHost) return;

    console.log("🔍 Loading video:", newVideoId, "at", startSeconds);
    setVideoId(newVideoId);
    setIsPlaying(true);
    setCurrentTimestamp(startSeconds);
    isLocalChange.current = true;

    let loaded = false;

    if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
      playerRef.current.loadVideoById({
        videoId: newVideoId,
        startSeconds,
      });
      setTimeout(() => {
        if (playerRef.current && typeof playerRef.current.playVideo === "function") {
          playerRef.current.playVideo();
        }
      }, 500);
      loaded = true;
    } else if (playerRef.current && typeof playerRef.current.cueVideoById === "function") {
      playerRef.current.cueVideoById({
        videoId: newVideoId,
        startSeconds,
      });
      if (typeof playerRef.current.playVideo === "function") {
        playerRef.current.playVideo();
      }
      loaded = true;
    }

    if (loaded) {
      lastLoadedVideoId.current = newVideoId;
    } else {
      lastLoadedVideoId.current = null;
    }

    if (socket) {
      socket.emit("youtube:play", {
        videoId: newVideoId,
        currentTime: startSeconds,
      });
    }

    if (options.closeSearch) {
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  const onPlayerReady = (event: any) => {
    console.log("✅ YouTube player ready", {
      videoId,
      currentTimestamp,
      isPlaying,
      playerState: event.target.getPlayerState(),
    });
    
    try {
      // Set initial volume
      event.target.setVolume(externalVolume);
      setIsPlayerReady(true);
      
      if (currentTimestamp > 0) {
        console.log(`⏩ Seeking to ${currentTimestamp}s`);
        event.target.seekTo(currentTimestamp, true);
      }
      if (isPlaying) {
        console.log("▶️ Auto-playing video");
        event.target.playVideo();
      }
    } catch (error) {
      console.error("❌ Error in onPlayerReady:", error);
    }
  };

  const onPlayerStateChange = (event: any) => {
    const state = event.data;
    console.log("🎬 Player state changed:", state);

    // Only emit events if this is a local change (user action)
    if (!isLocalChange.current && isHost && socket) {
      const currentTime = event.target.getCurrentTime();

      if (state === window.YT.PlayerState.PLAYING) {
        console.log("▶️ Emitting youtube:play");
        socket.emit("youtube:play", {
          videoId: videoId,
          currentTime,
        });
        setIsPlaying(true);
      } else if (state === window.YT.PlayerState.PAUSED) {
        console.log("⏸️ Emitting youtube:pause");
        socket.emit("youtube:pause", {
          currentTime,
        });
        setIsPlaying(false);
      }
    }

    isLocalChange.current = false;
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleYouTubeSync = (data: {
      videoId: string;
      currentTime: number;
      isPlaying: boolean;
    }) => {
      console.log("📺 YouTube sync received:", data);

      if (isHost && data.videoId && data.videoId !== videoId) {
        console.warn("⚠️ Ignoring stale sync for host", { currentVideoId: videoId, incomingVideoId: data.videoId });
        return;
      }

      isLocalChange.current = true;

      if (data.videoId && data.videoId !== videoId) {
        setVideoId(data.videoId);
        if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
          playerRef.current.loadVideoById({
            videoId: data.videoId,
            startSeconds: data.currentTime,
          });
        }
      }

      if (data.videoId) {
        lastLoadedVideoId.current = data.videoId;
      }

      if (playerRef.current && typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(data.currentTime, true);
        if (data.isPlaying && typeof playerRef.current.playVideo === "function") {
          playerRef.current.playVideo();
        } else if (!data.isPlaying && typeof playerRef.current.pauseVideo === "function") {
          playerRef.current.pauseVideo();
        }
      }

      setCurrentTimestamp(data.currentTime);
      setIsPlaying(data.isPlaying);
    };

    const handleYouTubePlay = (data: { videoId?: string; currentTime: number; userId: string }) => {
      console.log("▶️ YouTube play received:", data);

      if (isHost && data.videoId && data.videoId !== videoId) {
        console.warn("⚠️ Ignoring stale play event for host", { currentVideoId: videoId, incomingVideoId: data.videoId });
        return;
      }

      isLocalChange.current = true;

      if (data.videoId && data.videoId !== videoId) {
        setVideoId(data.videoId);
        if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
          playerRef.current.loadVideoById({
            videoId: data.videoId,
            startSeconds: data.currentTime,
          });
        }
      }

      if (playerRef.current && typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(data.currentTime, true);
        if (typeof playerRef.current.playVideo === "function") {
          playerRef.current.playVideo();
        }
      }

      lastLoadedVideoId.current = data.videoId ?? lastLoadedVideoId.current;
      setCurrentTimestamp(data.currentTime);
      setIsPlaying(true);
    };

    const handleYouTubePause = (data: { currentTime: number; userId: string }) => {
      console.log("⏸️ YouTube pause received:", data);

      if (isHost && data.currentTime < currentTimestamp - 2) {
        console.warn("⚠️ Ignoring stale pause event for host", { currentTimestamp, incomingTime: data.currentTime });
        return;
      }

      isLocalChange.current = true;

      if (playerRef.current && typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(data.currentTime, true);
        if (typeof playerRef.current.pauseVideo === "function") {
          playerRef.current.pauseVideo();
        }
      }

      setCurrentTimestamp(data.currentTime);
      setIsPlaying(false);
    };

    const handleYouTubeSeek = (data: { currentTime: number; userId: string }) => {
      console.log("⏩ YouTube seek received:", data);

      if (isHost && Math.abs(data.currentTime - currentTimestamp) > 5) {
        console.warn("⚠️ Ignoring stale seek event for host", { currentTimestamp, incomingTime: data.currentTime });
        return;
      }

      isLocalChange.current = true;

      if (playerRef.current && typeof playerRef.current.seekTo === "function") {
        playerRef.current.seekTo(data.currentTime, true);
      }
    };

    const handleYouTubeClear = () => {
      console.log("❌ YouTube clear received from host");
      isLocalChange.current = true;

      setVideoId("");
      setIsPlaying(false);
      lastLoadedVideoId.current = null;
      
      if (playerRef.current && typeof playerRef.current.stopVideo === "function") {
        playerRef.current.stopVideo();
      }
    };

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
  }, [socket, videoId]);

  const extractVideoId = (url: string): string | null => {
    // Support various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  };

  const handleSearch = () => {
    if (!isHost) return;

    const extractedId = extractVideoId(searchQuery);
    if (!extractedId) {
      alert("Invalid YouTube URL or video ID");
      return;
    }

    loadAndBroadcastVideo(extractedId, 0, { closeSearch: true });
  };

  const handleTogglePlay = () => {
    if (!isHost) return;

    const currentTime = getCurrentTime();

    if (isPlaying) {
      console.log("⏸️ Host pausing video");
      isLocalChange.current = true;
      if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
        playerRef.current.pauseVideo();
      }
      setCurrentTimestamp(currentTime);
      if (socket) {
        socket.emit("youtube:pause", { currentTime });
      }
      setIsPlaying(false);
    } else {
      console.log("▶️ Host playing video");
      isLocalChange.current = true;
      if (playerRef.current && typeof playerRef.current.playVideo === "function") {
        playerRef.current.playVideo();
      }
      setCurrentTimestamp(currentTime);
      if (socket) {
        socket.emit("youtube:play", { videoId, currentTime });
      }
      setIsPlaying(true);
    }
  };

  const handleClearVideo = () => {
    if (!isHost) return;

    console.log("❌ Clearing video for all users");
    
    // Clear video on host side
    setVideoId("");
    lastLoadedVideoId.current = null;
    setIsPlaying(false);
    if (playerRef.current && typeof playerRef.current.stopVideo === "function") {
      isLocalChange.current = true;
      playerRef.current.stopVideo();
    }

    // Emit clear event to server
    if (socket) {
      socket.emit("youtube:clear");
    }
  };

  // Sync volume from external control
  useEffect(() => {
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(externalVolume);
      console.log(`🔊 Volume synced to ${externalVolume}%`);
    }
  }, [externalVolume]);

  useImperativeHandle(ref, () => ({
    handleTogglePlay: () => handleTogglePlay(),
    handleSelectVideo: (id: string, startSeconds = 0) => loadAndBroadcastVideo(id, startSeconds),
    handleClearVideo: () => handleClearVideo(),
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
      videoId: videoId || null,
      currentTime: getCurrentTime(),
      isPlaying,
    }),
  }));

  if (!videoId && !showSearch) {
    console.log('📺 [YouTubePlayer] No video, showing empty state:', { isHost, videoId, showSearch });
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          {isHost ? (
            <Button onClick={() => setShowSearch(true)} className="gap-2">
              <Search className="w-4 h-4" />
              Search YouTube Video
            </Button>
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
  
  console.log('📺 [YouTubePlayer] Rendering player:', { videoId, showSearch, isHost });

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm">
            YouTube Player {videoId && `(${videoId})`}
          </CardTitle>
          <div className="flex items-center gap-3">
            {/* Controls moved to sidebar - keeping player clean */}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showSearch && isHost && (
          <div className="flex gap-2">
            <Input
              placeholder="Paste YouTube URL or video ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <Button onClick={handleSearch} size="sm">
              Load
            </Button>
          </div>
        )}

        <div className="aspect-video bg-black rounded overflow-hidden relative">
          <div ref={playerDivRef} className="w-full h-full" />
          {!playerRef.current && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              Loading YouTube Player...
            </div>
          )}
          {/* Overlay to prevent participants from clicking on video */}
          {!isHost && (
            <div 
              className="absolute inset-0 cursor-not-allowed z-10"
              style={{ pointerEvents: 'auto' }}
              title="Only host can control video"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
});


