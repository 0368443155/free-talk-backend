"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface YouTubeSearchResult {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  duration: string;
  viewCount: string;
}

interface YouTubeSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelectVideo: (videoId: string) => void;
  isHost?: boolean;
  currentVideoId?: string | null;
  isPlaying?: boolean;
  volume?: number;
  onTogglePlay?: () => void;
  onClear?: () => void;
  onVolumeChange?: (volume: number) => void;
  onMute?: () => void;
  embedded?: boolean; // New prop for sidebar mode
}

export function YouTubeSearchModal({ 
  open, 
  onClose, 
  onSelectVideo,
  isHost = false,
  currentVideoId = null,
  isPlaying = false,
  volume = 50,
  onTogglePlay,
  onClear,
  onVolumeChange,
  onMute,
  embedded = false,
}: YouTubeSearchModalProps) {
  if (!open && !embedded) return null;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // YouTube search with real API
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);

    try {
      const API_KEY = "AIzaSyCeToRocXgGeTe-DGDH1QNX-onlC5A-pEM";
      
      // Step 1: Search for videos
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&q=${encodeURIComponent(searchQuery)}&` +
        `type=video&maxResults=10&key=${API_KEY}`
      );
      
      const searchData = await searchResponse.json();
      
      if (searchData.error) {
        console.error("YouTube API error:", searchData.error);
        alert("Search failed: " + searchData.error.message);
        setIsSearching(false);
        return;
      }
      
      if (searchData.items && searchData.items.length > 0) {
        // Step 2: Get video details (duration, views)
        const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
        const detailsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?` +
          `part=contentDetails,statistics&id=${videoIds}&key=${API_KEY}`
        );
        
        const detailsData = await detailsResponse.json();
        
        // Step 3: Map results
        const results: YouTubeSearchResult[] = searchData.items.map((item: any, index: number) => {
          const details = detailsData.items[index];
          return {
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            channelTitle: item.snippet.channelTitle,
            duration: formatDuration(details.contentDetails.duration),
            viewCount: formatViews(details.statistics.viewCount),
          };
        });
        
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("YouTube search error:", error);
      alert("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Format ISO 8601 duration to readable format
  const formatDuration = (isoDuration: string): string => {
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = match?.[1]?.replace('H', '') || '0';
    const minutes = match?.[2]?.replace('M', '') || '0';
    const seconds = match?.[3]?.replace('S', '') || '0';
    
    if (hours !== '0') {
      return `${hours}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.padStart(2, '0')}`;
  };

  // Format view count to readable format
  const formatViews = (count: string): string => {
    const num = parseInt(count);
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B views`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K views`;
    return `${num} views`;
  };

  const handleSelectVideo = (videoId: string) => {
    onSelectVideo(videoId);
    onClose();
    setSearchQuery("");
    setSearchResults([]);
  };

  const containerClass = embedded 
    ? "h-full flex flex-col bg-[#0f0f0f]" 
    : "fixed right-0 top-0 h-full w-96 bg-[#0f0f0f] border-l border-gray-800 z-50 flex flex-col shadow-2xl";

  return (
    <div className={containerClass}>
      {/* Header - Only show close button when not embedded */}
      {!embedded && (
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <span className="text-white font-medium">YouTube</span>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-800">
        <div className="relative">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full bg-[#121212] border-gray-700 text-white pl-10 pr-4 h-10 rounded-full focus:border-blue-500"
            autoFocus
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <button className="px-3 py-1 text-xs bg-[#272727] text-white rounded-full hover:bg-[#3f3f3f] transition-colors">
            Autoplay ON
          </button>
          <button className="px-3 py-1 text-xs bg-[#272727] text-white rounded-full hover:bg-[#3f3f3f] transition-colors">
            Private OFF
          </button>
        </div>
      </div>

      {/* Player Controls - Only show when NOT embedded (meeting-room handles controls) */}
      {!embedded && currentVideoId && (
        <div className="p-4 border-b border-gray-800 bg-[#0f0f0f] flex-shrink-0">
          <div className="flex flex-col gap-3">
            {/* Host Controls */}
            {isHost && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onTogglePlay}
                  className="flex-1 bg-[#272727] hover:bg-[#3f3f3f] text-white border-0"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={onClear}
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {/* Volume Control - All users */}
            <div className="flex items-center gap-3 bg-[#272727] rounded-lg px-3 py-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onMute}
                className="text-gray-300 hover:text-white p-0 h-auto"
              >
                {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider
                value={[volume]}
                onValueChange={(v) => onVolumeChange?.(v[0])}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-gray-300 min-w-[36px] text-right">{volume}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {searchResults.length === 0 && !isSearching && (
            <div className="text-center text-gray-400 py-12 px-4">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Search for YouTube videos</p>
            </div>
          )}

          {searchResults.map((video) => (
            <div
              key={video.id}
              className="p-2 hover:bg-[#272727] rounded-lg cursor-pointer transition-colors mb-2"
              onClick={() => handleSelectVideo(video.id)}
            >
              {/* Thumbnail */}
              <div className="relative mb-2">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full aspect-video object-cover rounded-lg"
                />
                <div className="absolute bottom-1 right-1 bg-black/90 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                  {video.duration}
                </div>
              </div>

              {/* Info */}
              <div className="px-1">
                <h3 className="text-white text-sm font-medium line-clamp-2 mb-1 leading-tight">
                  {video.title}
                </h3>
                <p className="text-gray-400 text-xs mb-0.5">{video.channelTitle}</p>
                <p className="text-gray-500 text-xs">{video.viewCount}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
