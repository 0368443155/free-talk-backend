"use client";

import { Users, MessageSquare, Play } from "lucide-react";

interface MeetingHeaderProps {
  meetingTitle: string;
  onlineParticipantsCount: number;
  maxParticipants: number;
  isConnected: boolean;
  showParticipants: boolean;
  showChat: boolean;
  showYouTubeSearch: boolean;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onToggleYouTubeSearch: () => void;
}

export function MeetingHeader({
  meetingTitle,
  onlineParticipantsCount,
  maxParticipants,
  isConnected,
  showParticipants,
  showChat,
  showYouTubeSearch,
  onToggleParticipants,
  onToggleChat,
  onToggleYouTubeSearch,
}: MeetingHeaderProps) {
  return (
    <div className="bg-gray-800 px-4 py-2 flex items-center justify-between flex-shrink-0 border-b border-gray-700">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-bold text-white">
          {meetingTitle} - {onlineParticipantsCount} / {maxParticipants} participants
        </h1>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-400">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>
      
      {/* Header Tabs */}
      <div className="flex items-center">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            showParticipants 
              ? 'text-white bg-gray-700' 
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
          title="Participants"
          onClick={onToggleParticipants}
        >
          <Users className="w-4 h-4 mr-1 inline" />
          Participants
        </button>
        <div className="w-px h-4 bg-gray-600"></div>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            showChat 
              ? 'text-white bg-gray-700' 
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
          title="Chat"
          onClick={onToggleChat}
        >
          <MessageSquare className="w-4 h-4 mr-1 inline" />
          Chat
        </button>
        <div className="w-px h-4 bg-gray-600"></div>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            showYouTubeSearch 
              ? 'text-white bg-gray-700' 
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
          title="Play"
          onClick={onToggleYouTubeSearch}
        >
          <Play className="w-4 h-4 mr-1 inline" />
          Play
        </button>
      </div>
    </div>
  );
}

