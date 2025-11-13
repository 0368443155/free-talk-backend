"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Search, X, Volume2, VolumeX } from "lucide-react";
import { YouTubeSearchModal } from "./youtube-search-modal";

interface YouTubeControlsProps {
  isHost: boolean;
  videoId: string | null;
  isPlaying: boolean;
  volume: number;
  onTogglePlay: () => void;
  onSelectVideo: (videoId: string) => void;
  onClearVideo: () => void;
  onVolumeChange: (volume: number[]) => void;
  onToggleMute: () => void;
}

export function YouTubeControls({
  isHost,
  videoId,
  isPlaying,
  volume,
  onTogglePlay,
  onSelectVideo,
  onClearVideo,
  onVolumeChange,
  onToggleMute,
}: YouTubeControlsProps) {
  const [showSearchModal, setShowSearchModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 bg-gray-800/80 rounded-lg px-3 py-1.5 border border-gray-700">
        {/* Host controls */}
        {isHost && (
          <>
            {/* Search button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSearchModal(true)}
              className="text-gray-300 hover:text-white p-2 h-auto"
              title="Search YouTube"
            >
              <Search className="w-4 h-4" />
            </Button>

            {/* Play/Pause button - only show if video loaded */}
            {videoId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onTogglePlay}
                className="text-gray-300 hover:text-white p-2 h-auto"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            )}

            {/* Clear video button */}
            {videoId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearVideo}
                className="text-gray-300 hover:text-red-400 p-2 h-auto"
                title="Clear video"
              >
                <X className="w-4 h-4" />
              </Button>
            )}

            {videoId && <div className="w-px h-4 bg-gray-700" />}
          </>
        )}

        {/* Volume controls - always visible if video loaded */}
        {videoId && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleMute}
              className="text-gray-300 hover:text-white p-2 h-auto"
              title={volume === 0 ? "Unmute" : "Mute"}
            >
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider
              value={[volume]}
              onValueChange={onVolumeChange}
              min={0}
              max={100}
              step={1}
              className="w-24"
            />
            <span className="text-xs text-gray-300 font-medium min-w-[38px] text-right tabular-nums">
              {volume}%
            </span>
          </>
        )}

        {/* Show status if no video */}
        {!videoId && (
          <span className="text-xs text-gray-400 px-2">
            {isHost ? "Click search to add video" : "No video playing"}
          </span>
        )}
      </div>

      {/* Search Modal */}
      <YouTubeSearchModal
        open={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectVideo={onSelectVideo}
      />
    </>
  );
}
