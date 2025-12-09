'use client';

import { useEffect, useRef, memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Video as VideoIcon, VideoOff, Crown, Shield, Maximize2, Loader2 } from "lucide-react";
import { IMeetingParticipant, ParticipantRole } from "@/api/meeting.rest";

interface VideoGridProps {
  localStream: MediaStream | null;
  screenStream: MediaStream | null; // 🔥 NEW: Separate screen stream from V2
  peers: Map<string, { userId: string; connection: RTCPeerConnection; stream?: MediaStream }>;
  connectionStates: Map<string, RTCPeerConnectionState>; // 🔥 FIX 1: Connection states
  remoteScreenShares?: Map<string, MediaStream>; // 🔥 FIX: Remote screen shares
  participants: IMeetingParticipant[];
  currentUserId: string;
  isMuted: boolean;
  isVideoOff: boolean;
  spotlightUserId?: string;
  isScreenSharing?: boolean;
}

// Helper function to get role icon
const getRoleIcon = (role: ParticipantRole) => {
  switch (role) {
    case ParticipantRole.HOST:
      return <Crown className="w-4 h-4 text-yellow-500" />;
    case ParticipantRole.MODERATOR:
      return <Shield className="w-4 h-4 text-blue-500" />;
    default:
      return null;
  }
};

// 🔥 FIX: Simplified LocalVideo without polling
interface LocalVideoProps {
  localStream: MediaStream | null;
  currentParticipant: IMeetingParticipant;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
}

const LocalVideo = memo(({ localStream, currentParticipant, isMuted, isVideoOff, isScreenSharing }: LocalVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (localStream) {
      console.log('[LocalVideo] Setting srcObject:', {
        streamId: localStream.id,
        videoTracks: localStream.getVideoTracks().length,
      });

      videoRef.current.srcObject = localStream;
      videoRef.current
        .play()
        .catch(err => {
          if (err?.name === 'AbortError') {
            console.debug('[LocalVideo] Playback aborted (likely due to stream switch).');
            return;
          }
          console.error('[LocalVideo] Failed to play video:', err);
        });
    } else {
      videoRef.current.srcObject = null;
    }
  }, [localStream]);

  // 🔥 FIX: Simple check - if we have stream and video tracks, show video
  const hasVideoTrack = (localStream?.getVideoTracks().length ?? 0) > 0;
  const videoTrack = localStream?.getVideoTracks()[0];
  const isVideoEnabled = videoTrack?.enabled ?? false;
  const shouldShowVideo = localStream && hasVideoTrack && isVideoEnabled;

  console.log('[LocalVideo] Render:', {
    hasStream: !!localStream,
    hasVideoTrack,
    isVideoEnabled,
    isVideoOff,
    shouldShowVideo,
  });

  return (
    <Card className="bg-gray-800 border-gray-700 relative">
      <CardContent className="p-0 aspect-video relative">
        {shouldShowVideo ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover rounded ${isScreenSharing ? '' : 'scale-x-[-1]'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <Avatar className="w-24 h-24">
              <AvatarImage src={currentParticipant.user.avatar_url} />
              <AvatarFallback>{currentParticipant.user.name[0]}</AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Overlay info */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-black/50 px-2 py-1 rounded">
            {getRoleIcon(currentParticipant.role)}
            <span className="text-white text-xs font-medium truncate line-clamp-1 w-32">
              {currentParticipant.user.name} (You)
            </span>
          </div>
          <div className="flex gap-1">
            {isMuted ? (
              <MicOff className="w-4 h-4 text-red-500" />
            ) : (
              <Mic className="w-4 h-4 text-green-500" />
            )}
            {!shouldShowVideo ? (
              <VideoOff className="w-4 h-4 text-red-500" />
            ) : (
              <VideoIcon className="w-4 h-4 text-green-500" />
            )}
          </div>
        </div>

        {/* Fullscreen button */}
        <button
          onClick={() => videoRef.current?.requestFullscreen().catch(() => { })}
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded p-1"
          aria-label="Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </CardContent>
    </Card>
  );
});

LocalVideo.displayName = 'LocalVideo';

// Remote video component
interface RemoteVideoProps {
  stream?: MediaStream;
  participant: IMeetingParticipant;
  connectionState?: RTCPeerConnectionState; // 🔥 FIX 1: Connection state
}

const RemoteVideo = memo(({ stream, participant, connectionState }: RemoteVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current
          .play()
          .catch(err => {
            if (err?.name === 'AbortError') {
              console.debug('[RemoteVideo] Playback aborted (likely due to stream switch).');
              return;
            }
            console.error('[RemoteVideo] Failed to play video:', err);
          });
      }

      const videoTracks = stream.getVideoTracks();
      setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);

      // Listen for track changes
      const handleTrack = () => {
        const vTracks = stream.getVideoTracks();
        setHasVideo(vTracks.length > 0 && vTracks[0].enabled);
      };

      stream.addEventListener('addtrack', handleTrack);
      stream.addEventListener('removetrack', handleTrack);

      return () => {
        stream.removeEventListener('addtrack', handleTrack);
        stream.removeEventListener('removetrack', handleTrack);
      };
    }
  }, [stream]);

  return (
    <Card className="bg-gray-800 border-gray-700 relative">
      <CardContent className="p-0 aspect-video relative">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <Avatar className="w-24 h-24">
              <AvatarImage src={participant.user.avatar_url} />
              <AvatarFallback>{participant.user.name[0]}</AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Overlay info */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-black/50 px-2 py-1 rounded">
            {getRoleIcon(participant.role)}
            <span className="text-white text-xs font-medium">
              {participant.user.name}
            </span>
          </div>
          <div className="flex gap-1">
            {participant.is_muted && <MicOff className="w-4 h-4 text-red-500" />}
            {participant.is_video_off && <VideoOff className="w-4 h-4 text-red-500" />}
          </div>
        </div>

        {/* Fullscreen button */}
        {stream && (
          <button
            onClick={() => videoRef.current?.requestFullscreen().catch(() => { })}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded p-1"
            aria-label="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        {/* 🔥 FIX 1: Connection state badge */}
        <div className="absolute top-2 right-2">
          {connectionState === 'connecting' && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Connecting...
            </Badge>
          )}
          {connectionState === 'failed' && (
            <Badge variant="destructive" className="text-xs">
              ❌ Failed
            </Badge>
          )}
          {connectionState === 'disconnected' && (
            <Badge variant="secondary" className="text-xs">
              ⚠️ Reconnecting...
            </Badge>
          )}
          {!connectionState && !stream && (
            <Badge variant="secondary" className="text-xs">
              Connecting...
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

RemoteVideo.displayName = 'RemoteVideo';

export function VideoGrid({
  localStream,
  screenStream, // 🔥 NEW: Separate screen stream from V2
  peers,
  connectionStates, // 🔥 FIX 1: Connection states
  remoteScreenShares, // 🔥 FIX: Remote screen shares
  participants,
  currentUserId,
  isMuted,
  isVideoOff,
  spotlightUserId,
  isScreenSharing
}: VideoGridProps) {
  const getParticipantInfo = (userId: string) => {
    return participants.find(p =>
      p.user.user_id === userId ||
      p.user.id === userId
    );
  };

  const onlineParticipants = participants.filter(p => p.is_online);
  const currentParticipant = participants.find(p =>
    p.user.user_id === currentUserId ||
    p.user.id === currentUserId
  );

  if (onlineParticipants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">No participants online</p>
      </div>
    );
  }

  // Decide spotlight participant
  const spotlightPeer = spotlightUserId ? peers.get(spotlightUserId) : undefined;
  const spotlightParticipant = spotlightUserId ? getParticipantInfo(spotlightUserId) : undefined;

  return (
    <div className="p-4 space-y-4">
      {/* 🔥 NEW: Screen share section (full width, above everything) */}
      {screenStream && (
        <div className="w-full mb-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0 aspect-video relative">
              <video
                ref={(el) => {
                  if (el && screenStream) {
                    el.srcObject = screenStream;
                    el.play().catch(console.error);
                  }
                }}
                autoPlay
                playsInline
                className="w-full h-full object-contain rounded bg-black"
              />
              <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded">
                <span className="text-white text-sm font-medium">
                  🖥️ Your Screen
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 🔥 FIX: REMOTE SCREENS */}
      {remoteScreenShares && Array.from(remoteScreenShares.entries()).map(([userId, stream]) => {
        const participant = getParticipantInfo(userId);
        if (!participant) return null;
        
        return (
          <div key={`screen-${userId}`} className="w-full mb-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0 aspect-video relative">
                <video
                  ref={(el) => {
                    if (el && stream) {
                      el.srcObject = stream;
                      el.play().catch(console.error);
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain bg-black rounded"
                />
                <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded flex items-center gap-2">
                  <span className="text-white text-sm font-medium">
                    🖥️ {participant.user.name}'s Screen
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}

      {/* Spotlight section */}
      {spotlightUserId && spotlightParticipant && (
        <div className="w-full">
          {spotlightUserId === currentUserId ? (
            <LocalVideo
              key="spotlight-local"
              localStream={localStream}
              currentParticipant={spotlightParticipant}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
            />
          ) : (
            <RemoteVideo
              key={`spotlight-${spotlightUserId}`}
              stream={spotlightPeer?.stream}
              participant={spotlightParticipant}
              connectionState={connectionStates.get(spotlightUserId)} // 🔥 FIX 1
            />
          )}
        </div>
      )}

      {/* Grid section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
        {/* Local video */}
        {currentParticipant && (
          <LocalVideo
            key="local-video"
            localStream={localStream}
            currentParticipant={currentParticipant}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
          />
        )}

        {/* Remote videos with peer connections */}
        {Array.from(peers.entries()).map(([userId, peer]) => {
          const participant = getParticipantInfo(userId);
          if (!participant) {
            console.warn('[VideoGrid] Participant not found for peer:', userId);
            return null;
          }
          if (spotlightUserId && userId === spotlightUserId) return null; // skip duplicate spotlight tile
          const connectionState = connectionStates.get(userId); // 🔥 FIX 1
          return (
            <RemoteVideo
              key={`peer-${userId}`}
              stream={peer.stream}
              participant={participant}
              connectionState={connectionState} // 🔥 FIX 1
            />
          );
        })}

        {/* Participants without peer connection yet */}
        {onlineParticipants
          .filter(p => {
            const userId = p.user.user_id || p.user.id;
            const isCurrent = userId === currentUserId;
            const hasPeer = peers.has(userId);
            const isSpotlight = spotlightUserId && userId === spotlightUserId;
            return !isCurrent && !hasPeer && !isSpotlight;
          })
          .map(participant => {
            const userId = participant.user.user_id || participant.user.id;
            return (
              <RemoteVideo
                key={`waiting-${userId}`}
                participant={participant}
                connectionState={connectionStates.get(userId)} // 🔥 FIX 1
              />
            );
          })}
      </div>
    </div>
  );
}