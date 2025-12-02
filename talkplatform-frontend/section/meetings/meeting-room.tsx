"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMeetingSocket } from "@/hooks/use-meeting-socket";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useWebRTCStatsWorker } from "@/hooks/useWebRTCStatsWorker";
import { useThrottledMetrics } from "@/hooks/useThrottledMetrics";
import { VideoGrid } from "./video-grid";
import { MeetingChat } from "./meeting-chat";
import { YouTubePlayer, YouTubePlayerHandle } from "./youtube-player";
import { YouTubeSearchModal } from "@/components/youtube-search-modal";
import { LiveKitRoomWrapper } from "@/components/meeting/livekit-room-wrapper";
import { GreenRoom } from "@/components/meeting/green-room";
import { MeetingJoinOptions } from "@/components/meeting/meeting-join-options";
import { MeetingParticipantsPanel } from "@/components/meeting/meeting-participants-panel";
import { MeetingChatPanel } from "@/components/meeting/meeting-chat-panel";
import { MeetingHeader } from "@/components/meeting/meeting-header";
import { MeetingDialogs } from "@/components/meeting/meeting-dialogs";
import { useMeetingYouTube } from "@/hooks/use-meeting-youtube";
import { useMeetingChat } from "@/hooks/use-meeting-chat";
import { useMeetingParticipants } from "@/hooks/use-meeting-participants";
import { useYouTubeControls } from "@/hooks/use-youtube-controls";
import { Slider } from "@/components/ui/slider";
import { MeetingBandwidthMonitor } from "@/components/meeting-bandwidth-monitor";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Users,
  MessageSquare,
  Lock,
  Unlock,
  UserX,
  VolumeX,
  Volume2,
  Crown,
  Shield,
  RefreshCw,
  Play,
  Pause,
  Search,
  X,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Send,
  Loader2,
  Smile,
} from "lucide-react";
import { IUserInfo } from "@/api/user.rest";
import {
  IMeeting,
  IMeetingParticipant,
  IMeetingChatMessage,
  ParticipantRole,
  MessageType,
  getMeetingParticipantsApi,
  getPublicMeetingParticipantsApi,
  getMeetingChatApi,
  getPublicMeetingChatApi,
  joinMeetingApi,
  joinPublicMeetingApi,
  safeJoinPublicMeetingApi,
  lockMeetingApi,
  unlockMeetingApi,
  lockPublicMeetingApi,
  unlockPublicMeetingApi,
  leaveMeetingApi,
  leavePublicMeetingApi,
  kickParticipantApi,
  kickPublicMeetingParticipantApi,
  blockPublicMeetingParticipantApi,
  muteParticipantApi,
  mutePublicMeetingParticipantApi,
  promoteParticipantApi,
  promotePublicMeetingParticipantApi,
} from "@/api/meeting.rest";

interface MeetingRoomProps {
  meeting: IMeeting;
  user: IUserInfo;
  classroomId?: string;
  onReconnect?: () => void;
}

export function MeetingRoom({ meeting, user, classroomId, onReconnect }: MeetingRoomProps) {
  // Meeting state
  // Use shared participants hook
  const {
    participants,
    setParticipants,
    participantsFetched,
    setParticipantsFetched,
    fetchParticipants,
    handleKickParticipant: handleKickParticipantApi,
    handleBlockParticipant: handleBlockParticipantApi,
    handleMuteParticipant: handleMuteParticipantApi,
  } = useMeetingParticipants({
    meetingId: meeting.id,
    isPublicMeeting: !classroomId,
    classroomId,
  });

  // Dialog states
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [confirmKickOpen, setConfirmKickOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [targetParticipant, setTargetParticipant] = useState<{ id: string; name: string } | null>(null);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');
  const [showRoomFullDialog, setShowRoomFullDialog] = useState(false);
  
  // UI states
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showFunctions, setShowFunctions] = useState(false);
  const [showVideoGrid, setShowVideoGrid] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);
  const [youtubeVolume, setYoutubeVolume] = useState(50);
  const youtubePlayerRef = useRef<YouTubePlayerHandle | null>(null);
  
  const { toast } = useToast();
  const router = useRouter();
  const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null);

  // Meeting type selection state
  const [meetingTypeSelected, setMeetingTypeSelected] = useState(false);
  const [useLiveKit, setUseLiveKit] = useState<boolean | null>(null); // null = not selected yet
  const [livekitPhase, setLivekitPhase] = useState<'green-room' | 'meeting'>('green-room');
  const [showGreenRoom, setShowGreenRoom] = useState(false);
  
  // Chat input state
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  // Emoji list
  const EMOJI_CATEGORIES = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤐', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
    gestures: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
    hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️'],
    objects: ['🔥', '💯', '✨', '⭐', '🌟', '💫', '💥', '💢', '💤', '💨', '👁️', '👀', '🧠', '🦷', '🦴', '💀', '👻', '👽', '🤖', '💩', '🎉', '🎊', '🎈', '🎁', '🎀', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '⛳', '🏹', '🎣', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉'],
    symbols: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
  };
  const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

  // Determine if current user is the meeting host
  // Host has full control over YouTube player, meeting settings, etc.
  const isHost = meeting.host?.id === user.id;
  
  console.log("🎯 Meeting Room - Host Check:", {
    meetingHostId: meeting.host?.id,
    currentUserId: user.id,
    isHost,
    userRole: user.role,
  });
  const isPublicMeeting = !classroomId;

  // Meeting type selection handlers
  const handleJoinWithLiveKit = useCallback(() => {
    setUseLiveKit(true);
    setMeetingTypeSelected(true);
    setLivekitPhase('green-room');
    setShowGreenRoom(true);
  }, []);

  const handleJoinWithTraditional = useCallback(async () => {
    setUseLiveKit(false);
    setMeetingTypeSelected(true);
    setShowGreenRoom(false);
    // Continue with traditional meeting flow - will be called after handleJoinMeeting is defined
    setIsJoining(true);
    try {
      if (isPublicMeeting) {
        const joinResult = await safeJoinPublicMeetingApi(meeting.id);
        if (!joinResult.success) {
          if (joinResult.blocked) {
            setBlockedMessage(joinResult.message || 'You have been blocked from this meeting');
            setBlockedModalOpen(true);
            setIsJoining(false);
            return;
          }
          throw new Error(joinResult.message || 'Failed to join meeting');
        }
      } else {
        await joinMeetingApi(classroomId!, meeting.id);
      }
      toast({ title: "Success", description: "Joined meeting successfully" });
      await fetchParticipants();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "";
      const statusCode = error.response?.status;
      if (statusCode === 409) {
        const isRoomFull = errorMessage.toLowerCase().includes("full") || 
                          errorMessage.toLowerCase().includes("đầy") ||
                          errorMessage.toLowerCase().includes("maximum") ||
                          errorMessage.toLowerCase().includes("tối đa");
        if (isRoomFull) {
          setIsJoining(false);
          setShowRoomFullDialog(true);
          return;
        }
      }
      toast({
        title: "Error",
        description: errorMessage || "Failed to join meeting",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  }, [isPublicMeeting, meeting.id, classroomId, toast, fetchParticipants]);

  const handleLiveKitJoinMeeting = useCallback(() => {
    setLivekitPhase('meeting');
    setShowGreenRoom(false);
  }, []);

  const handleLiveKitLeave = useCallback(() => {
    setUseLiveKit(null);
    setMeetingTypeSelected(false);
    setLivekitPhase('green-room');
    setShowGreenRoom(false);
    router.push('/dashboard');
  }, [router]);

  const handleBackFromJoinOptions = useCallback(() => {
    router.push(isPublicMeeting ? "/meetings" : `/classrooms/${classroomId}`);
  }, [router, isPublicMeeting, classroomId]);

  // 🔥 FIX: Memoize current participant lookup to prevent unnecessary re-computations
  const currentParticipant = useMemo(() => {
    return participants.find(p => {
      const participantUserId = p.user?.id || p.user?.user_id;
      const currentUserId = user.id || user.user_id;
      return participantUserId === currentUserId;
    });
  }, [participants, user.id, user.user_id]);

  // 🔥 FIX: Memoize online status calculation
  const isOnline = useMemo(() => {
    return currentParticipant ? (currentParticipant.is_online !== false) : false;
  }, [currentParticipant]);

  // 🔥 FIX: Memoize online participants count to prevent unnecessary recalculations
  const onlineParticipantsCount = useMemo(() => {
    return participants.filter(p => p.is_online).length;
  }, [participants]);

  // Meeting socket connection - MUST be declared before useMeetingYouTube
  const { socket, isConnected, connectionError } = useMeetingSocket({
    meetingId: meeting.id,
    userId: user.id, // 🔥 FIX: Use user.id instead of user.user_id
    isOnline,
  });

  // Use shared YouTube hook - requires socket
  const {
    youtubeVideoId,
    youtubeIsPlaying,
    youtubeCurrentTime,
    setYoutubeVideoId,
    setYoutubeIsPlaying,
    setYoutubeCurrentTime,
  } = useMeetingYouTube({
    socket,
    initialVideoId: meeting.youtube_video_id ?? null,
    initialIsPlaying: !!meeting.youtube_is_playing,
    initialCurrentTime: meeting.youtube_current_time ?? 0,
  });

  // Use shared chat hook
  const {
    chatMessages,
    setChatMessages,
    handleSendMessage,
    fetchChatMessages,
  } = useMeetingChat({
    socket,
    meetingId: meeting.id,
    isPublicMeeting: !classroomId,
    classroomId,
    isOnline,
  });

  // Remove excessive socket status logging
  // console.log('🔌 [SOCKET] Status:', {
  //   hasSocket: !!socket,
  //   isConnected,
  //   socketId: socket?.id,
  //   socketConnected: socket?.connected,
  //   connectionError,
  // });

  const [showConnectionBanner, setShowConnectionBanner] = useState(false);

  useEffect(() => {
    setShowConnectionBanner(!isConnected && isOnline);
  }, [isConnected, isOnline]);

  useEffect(() => {
    if (isHost) return;

    setYoutubeVideoId(meeting.youtube_video_id ?? null);
    setYoutubeIsPlaying(!!meeting.youtube_is_playing);
    setYoutubeCurrentTime(meeting.youtube_current_time ?? 0);
  }, [isHost, meeting.youtube_video_id, meeting.youtube_is_playing, meeting.youtube_current_time]);

  // WebRTC
    const {
    localStream,
    peers,
    isMuted,
    isVideoOff,
    isScreenSharing,
    startLocalStream,
    stopLocalStream,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    getFirstPeerConnection,
  } = useWebRTC({
    socket,
    meetingId: meeting.id,
    userId: user.id,
    isOnline,
  });

  // Helper function to determine connection quality
  const getConnectionQuality = useCallback((
    latency: number, 
    packetLoss: number
  ): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (latency < 100 && packetLoss < 1) return 'excellent';
    if (latency < 200 && packetLoss < 3) return 'good';
    if (latency < 400 && packetLoss < 5) return 'fair';
    return 'poor';
  }, []);

  // Helper function to format bandwidth
  const formatBandwidth = useCallback((kbps: number): string => {
    if (kbps < 1000) return `${Math.round(kbps)} KB/s`;
    return `${(kbps / 1000).toFixed(1)} MB/s`;
  }, []);

  // Phase 2: WebRTC Stats Collection
  // Convert peers Map to RTCPeerConnection Map for stats worker
  const peerConnectionsMap = useMemo(() => {
    const connections = new Map<string, RTCPeerConnection>();
    peers.forEach((peer, userId) => {
      if (peer.connection) {
        connections.set(userId, peer.connection);
      }
    });
    return connections;
  }, [peers]);

  // Collect WebRTC stats using Web Worker
  const { stats: webrtcStats, workerReady: statsWorkerReady } = useWebRTCStatsWorker(peerConnectionsMap);

  // Debug: Log stats (có thể xóa sau khi test)
  useEffect(() => {
    if (webrtcStats.length > 0) {
      console.log('📊 [DEBUG] webrtcStats:', webrtcStats);
    }
  }, [webrtcStats]);

  // Calculate aggregated metrics
  const aggregatedMetrics = useMemo(() => {
    if (webrtcStats.length === 0) {
      return {
        uploadBitrate: 0,
        downloadBitrate: 0,
        latency: 0,
        packetLoss: 0,
        quality: 'good' as const,
        usingRelay: false,
      };
    }

    const totalUpload = webrtcStats.reduce((sum: number, s) => sum + s.uploadBitrate, 0);
    const totalDownload = webrtcStats.reduce((sum: number, s) => sum + s.downloadBitrate, 0);
    const avgLatency = webrtcStats.reduce((sum: number, s) => sum + s.latency, 0) / webrtcStats.length;
    const avgPacketLoss = webrtcStats.reduce((sum: number, s) => sum + s.packetLoss, 0) / webrtcStats.length;
    const usingRelay = webrtcStats.some((s: any) => s.usingRelay);
    
    // Determine connection quality
    const quality = getConnectionQuality(avgLatency, avgPacketLoss);
    
    return {
      uploadBitrate: totalUpload,
      downloadBitrate: totalDownload,
      latency: Math.round(avgLatency),
      packetLoss: Math.round(avgPacketLoss * 10) / 10,
      quality,
      usingRelay,
    };
  }, [webrtcStats, getConnectionQuality]);

  // Debug: Log aggregated metrics (có thể xóa sau khi test)
  useEffect(() => {
    if (aggregatedMetrics.downloadBitrate > 0 || aggregatedMetrics.uploadBitrate > 0) {
      console.log('📊 [DEBUG] aggregatedMetrics:', {
        upload: `${aggregatedMetrics.uploadBitrate} kbps`,
        download: `${aggregatedMetrics.downloadBitrate} kbps`,
        latency: `${aggregatedMetrics.latency}ms`,
        quality: aggregatedMetrics.quality,
        usingRelay: aggregatedMetrics.usingRelay,
        packetLoss: `${aggregatedMetrics.packetLoss}%`,
      });
    }
  }, [aggregatedMetrics]);

  // Throttled metrics emission to backend
  useThrottledMetrics(socket, meeting.id, aggregatedMetrics, user.id);

  // Bandwidth monitoring is now handled by backend middleware
  const isReporting = false;
  const isSimpleReporting = false;

  //  DEBUG: Log bandwidth status (có thể xóa sau khi test xong)
  useEffect(() => {
    if (isOnline) {
      console.log('📊 [MEETING-ROOM] Bandwidth Reporter Status:', {
        isReporting,
        meetingId: meeting.id.slice(0, 8) + '...',
        meetingTitle: meeting.title,
        userId: user.id.slice(0, 8) + '...',
        username: user.username,
        isOnline,
        peersCount: peers.size,
        participantsCount: participants.length,
        peerConnection: !!getFirstPeerConnection(),
        peerState: getFirstPeerConnection()?.connectionState
      });
    }
  }, [isReporting, isOnline, peers.size, participants.length]);

  console.log(`📊 [MEETING-ROOM] Bandwidth reporter status - isReporting: ${isReporting}`);

  // Spotlight self when starting/stopping local screen share
  useEffect(() => {
    if (isScreenSharing) {
      setSpotlightUserId(user.id);
    } else if (spotlightUserId === user.id) {
      setSpotlightUserId(null);
    }
  }, [isScreenSharing]);

  // Listen for others' screen-share events to spotlight them
  useEffect(() => {
    if (!socket) return;
    const handleUserScreenShare = (data: { userId: string; isSharing: boolean }) => {
      if (data.isSharing) {
        setSpotlightUserId(data.userId);
      } else if (spotlightUserId === data.userId) {
        setSpotlightUserId(null);
      }
    };
    socket.on('media:user-screen-share', handleUserScreenShare);
    return () => {
      socket.off('media:user-screen-share', handleUserScreenShare);
    };
  }, [socket, spotlightUserId]);

  useEffect(() => {
    if (isOnline && !localStream) {
      console.log('🎥 Starting local stream because user is online...');
      startLocalStream()
        .then(() => {
          console.log('✅ Local stream started successfully');
        })
        .catch((error: any) => {
          console.error('❌ Failed to start local stream:', error);
          const errorMessage = error?.message || error?.toString() || "Failed to access camera/microphone";
          toast({
            title: "Media Error",
            description: errorMessage.includes('permission') 
              ? errorMessage 
              : "Failed to access camera/microphone. Please check permissions and try again.",
            variant: "destructive",
          });
        });
    }
  }, [isOnline, localStream, startLocalStream, toast]);

  // Fetch initial data
  useEffect(() => {
    fetchParticipants();
    fetchChatMessages();

    const interval = setInterval(() => {
      fetchParticipants();
      fetchChatMessages();
    }, 10000); // Increase polling interval from 5s to 10s to reduce latency

    return () => clearInterval(interval);
  }, [fetchParticipants, fetchChatMessages]);

  // Chat handlers are now in useMeetingChat hook - no need for duplicate code

  // Realtime participants updates via socket (joined/left)
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = (data: { userId: string; userName?: string }) => {
      setParticipants(prev => {
        const updated = prev.map(p => {
          const pid = p.user.id || (p.user as any).user_id;
          if (pid === data.userId) {
            return { ...p, is_online: true } as IMeetingParticipant;
          }
          return p;
        });
        // If not found, keep list unchanged (periodic fetch will reconcile)
        return updated;
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setParticipants(prev => prev.map(p => {
        const pid = p.user.id || (p.user as any).user_id;
        if (pid === data.userId) {
          return { ...p, is_online: false } as IMeetingParticipant;
        }
        return p;
      }));
    };

    socket.on('meeting:user-joined', handleUserJoined);
    socket.on('meeting:user-left', handleUserLeft);

    return () => {
      socket.off('meeting:user-joined', handleUserJoined);
      socket.off('meeting:user-left', handleUserLeft);
    };
  }, [socket]);

  // Host moderation enforcement - listen for host commands
  useEffect(() => {
    if (!socket) return;

    const handleForceMute = (data: { userId: string; isMuted: boolean }) => {
      if (data.userId === user.id) {
        // Host changed my mute state - enforce it
        if (data.isMuted && !isMuted) {
          // Host muted me - force mute if not already muted
          toggleMute();
          toast({ 
            title: "You have been muted by the host", 
            description: "Your microphone has been turned off.",
            variant: "default" 
          });
        } else if (!data.isMuted && isMuted) {
          // Host unmuted me - force unmute if currently muted
          toggleMute();
          toast({ 
            title: "You have been unmuted by the host", 
            description: "Your microphone has been turned on.",
            variant: "default" 
          });
        }
      }
    };

    const handleForceVideoOff = (data: { userId: string; isVideoOff: boolean }) => {
      if (data.userId === user.id) {
        // Host changed my video state - enforce it
        if (data.isVideoOff && !isVideoOff) {
          // Host turned off my camera - force video off if not already off
          toggleVideo();
          toast({ 
            title: "Your camera has been turned off", 
            description: "The host has disabled your camera.",
            variant: "default" 
          });
        } else if (!data.isVideoOff && isVideoOff) {
          // Host turned on my camera - force video on if currently off
          toggleVideo();
          toast({ 
            title: "Your camera has been turned on", 
            description: "The host has enabled your camera.",
            variant: "default" 
          });
        }
      }
    };

    const handleForceStopShare = (data: { userId: string; isSharing: boolean }) => {
      if (data.userId === user.id && !data.isSharing) {
        // Host stopped my screen share - force stop if currently sharing
        if (isScreenSharing) {
          toggleScreenShare();
          toast({ 
            title: "Screen sharing stopped", 
            description: "The host has stopped your screen sharing.",
            variant: "default" 
          });
        }
      }
    };

    const handleKicked = (data: { userId: string; reason: string }) => {
      if (data.userId === user.id) {
        toast({
          title: "You have been kicked",
          description: data.reason,
          variant: "destructive",
        });
        // Redirect after 3 seconds
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 3000);
      }
    };

    const handleBlocked = (data: { userId: string; reason: string }) => {
      if (data.userId === user.id) {
        setBlockedMessage(data.reason + ". You cannot rejoin this meeting.");
        setBlockedModalOpen(true);
      }
    };

    socket.on('media:user-muted', handleForceMute);
    socket.on('media:user-video-off', handleForceVideoOff);
    socket.on('media:user-screen-share', handleForceStopShare);
    socket.on('user:kicked', handleKicked);
    socket.on('user:blocked', handleBlocked);

    return () => {
      socket.off('media:user-muted', handleForceMute);
      socket.off('media:user-video-off', handleForceVideoOff);
      socket.off('media:user-screen-share', handleForceStopShare);
      socket.off('user:kicked', handleKicked);
      socket.off('user:blocked', handleBlocked);
    };
  }, [socket, user.id, isMuted, isVideoOff, isScreenSharing, toggleMute, toggleVideo, toggleScreenShare, toast]);

  // Handle chat input send
  const handleChatInputSend = useCallback(async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !isOnline || isSending) return;

    try {
      setIsSending(true);
      await handleSendMessage(trimmedMessage);
      setNewMessage('');
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, isOnline, isSending, handleSendMessage]);

  // Handle Enter key in chat input
  const handleChatInputKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatInputSend();
    }
  }, [handleChatInputSend]);

  // Handle emoji click
  const handleEmojiClick = useCallback((emoji: string) => {
    setNewMessage(prev => prev + emoji);
    chatInputRef.current?.focus();
  }, []);

  // Auto-join logic - REMOVED: No longer auto-join, user must choose meeting type
  // The join options screen will be shown instead

  // fetchParticipants and fetchChatMessages are now provided by hooks

  const handleJoinMeeting = useCallback(async () => {
    console.log("🚪 [JOIN] Attempting to join meeting:", {
      hasCurrentParticipant: !!currentParticipant,
      isOnline: currentParticipant?.is_online,
      isJoining,
      meetingId: meeting.id,
      userId: user.id,
    });

    if (currentParticipant?.is_online) {
      console.log("✅ [JOIN] Already joined and online");
      return;
    }

    if (isJoining) {
      console.log("⏳ [JOIN] Join already in progress");
      return;
    }

    try {
      setIsJoining(true);
      console.log("📡 [JOIN] Calling join API...");

      if (isPublicMeeting) {
        const joinResult = await safeJoinPublicMeetingApi(meeting.id);
        
        if (!joinResult.success) {
          if (joinResult.blocked) {
            // Handle blocked user without console error
            console.log("🚫 [JOIN] User is blocked from this meeting");
            setBlockedMessage(joinResult.message || 'You have been blocked from this meeting');
            setBlockedModalOpen(true);
            setIsJoining(false);
            return;
          }
          // If not blocked but still failed, throw error to be handled below
          throw new Error(joinResult.message || 'Failed to join meeting');
        }
        // Join was successful, continue with normal flow
      } else {
        await joinMeetingApi(classroomId!, meeting.id);
      }
      
      console.log("✅ [JOIN] Join API success");
      toast({ title: "Success", description: "Joined meeting successfully" });
      
      await fetchParticipants();
      console.log("✅ [JOIN] Participants refreshed");
      
    } catch (error: any) {
      console.error("❌ [JOIN] Error:", error);

      const errorMessage = error.response?.data?.message || "";
      const statusCode = error.response?.status;
      
      // Handle 409 status code - room is full
      if (statusCode === 409) {
        // Check if it's a room full error or already participant
        const isRoomFull = errorMessage.toLowerCase().includes("full") || 
                          errorMessage.toLowerCase().includes("đầy") ||
                          errorMessage.toLowerCase().includes("maximum") ||
                          errorMessage.toLowerCase().includes("tối đa");
        
        if (isRoomFull) {
          // Show dialog for room full
          setIsJoining(false); // Stop loading immediately
          setShowRoomFullDialog(true);
          return; // Exit early to prevent further processing
        } else if (errorMessage.includes("already")) {
          // Already a participant, just fetch participants
          console.log("ℹ️ [JOIN] Already a participant, fetching...");
          await fetchParticipants();
        } else {
          // Other 409 errors - treat as room full for safety
          setIsJoining(false);
          setShowRoomFullDialog(true);
          return;
        }
      } else {
        // Other errors
        toast({
          title: "Error",
          description: errorMessage || "Failed to join meeting",
          variant: "destructive",
        });
      }
    } finally {
      setIsJoining(false);
    }
  }, [currentParticipant, isJoining, isPublicMeeting, meeting.id, classroomId, user.id, toast]);

  const handleLeaveMeeting = async () => {
    try {
      if (isPublicMeeting) {
        await leavePublicMeetingApi(meeting.id);
      } else {
        await leaveMeetingApi(classroomId!, meeting.id);
      }
      window.location.href = isPublicMeeting ? "/meetings" : `/classrooms/${classroomId}`;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to leave meeting",
        variant: "destructive",
      });
    }
  };

  // YouTube handlers - using shared hook
  const {
    handleYoutubeSelectVideo,
    handleYoutubeTogglePlay,
    handleYoutubeClear,
    handleYoutubeMute: handleYoutubeMuteBase,
  } = useYouTubeControls({
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
  });

  const handleYoutubeMute = () => {
    handleYoutubeMuteBase();
    setYoutubeVolume(prev => (prev === 0 ? 50 : 0));
  };

  const handleToggleLock = async () => {
    try {
      if (meeting.is_locked) {
        if (isPublicMeeting) {
          await unlockPublicMeetingApi(meeting.id);
        } else {
          await unlockMeetingApi(classroomId!, meeting.id);
        }
        toast({ title: "Success", description: "Meeting unlocked" });
      } else {
        if (isPublicMeeting) {
          await lockPublicMeetingApi(meeting.id);
        } else {
          await lockMeetingApi(classroomId!, meeting.id);
        }
        toast({ title: "Success", description: "Meeting locked" });
      }
      meeting.is_locked = !meeting.is_locked;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle lock",
        variant: "destructive",
      });
    }
  };

  // UI handlers for opening dialogs
  const handleKickParticipant = (participantId: string, participantName: string) => {
    setTargetParticipant({ id: participantId, name: participantName });
    setConfirmKickOpen(true);
  };

  const confirmKickParticipant = async () => {
    if (!targetParticipant) return;
    // Emit socket event for real-time notification
    socket?.emit('admin:kick-user', { 
      targetUserId: targetParticipant.id, 
      reason: 'Kicked by host' 
    });
    // Call API to actually kick
    await handleKickParticipantApi(targetParticipant.id, targetParticipant.name);
    setConfirmKickOpen(false);
    setTargetParticipant(null);
  };

  const handleBlockParticipant = (participantId: string, participantName: string) => {
    setTargetParticipant({ id: participantId, name: participantName });
    setConfirmBlockOpen(true);
  };

  const confirmBlockParticipant = async () => {
    if (!targetParticipant) return;
    // Emit socket event for real-time notification
    socket?.emit('admin:block-user', { 
      targetUserId: targetParticipant.id, 
      reason: 'Blocked by host' 
    });
    // Call API to actually block
    await handleBlockParticipantApi(targetParticipant.id, targetParticipant.name);
    setConfirmBlockOpen(false);
    setTargetParticipant(null);
  };


  const getRoleIcon = (role: ParticipantRole) => {
    if (role === ParticipantRole.HOST) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (role === ParticipantRole.MODERATOR) return <Shield className="w-4 h-4 text-blue-500" />;
    return null;
  };

  // Always show join options if meeting type not selected yet
  // This ensures users from lessons also see the join options before entering meeting
  if (!meetingTypeSelected) {
    // Show loading while fetching participants
    if (!participantsFetched) {
      return (
        <div className="h-screen flex items-center justify-center bg-gray-900">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-white">Loading meeting...</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Show join options - user must choose meeting type first
    // Even if participant already exists (from lesson join), still show options
    return (
      <>
        <MeetingJoinOptions
          meeting={meeting}
          isHost={isHost}
          onlineParticipantsCount={onlineParticipantsCount}
          isJoining={isJoining}
          isLocked={meeting.is_locked}
          onJoinTraditional={handleJoinWithTraditional}
          onJoinLiveKit={handleJoinWithLiveKit}
          onBack={handleBackFromJoinOptions}
        />
      </>
    );
  }

  // LiveKit Integration - Show Green Room or LiveKit Meeting
  if (useLiveKit && showGreenRoom && livekitPhase === 'green-room') {
    return (
      <GreenRoom
        meetingTitle={meeting.title}
        onJoinMeeting={handleLiveKitJoinMeeting}
        onCancel={handleLiveKitLeave}
      />
    );
  }

  // LiveKit Meeting Room
  if (useLiveKit && livekitPhase === 'meeting') {
    return (
      <LiveKitRoomWrapper
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        user={user}
        onLeave={handleLiveKitLeave}
        isHost={isHost}
        isPublicMeeting={isPublicMeeting}
      />
    );
  }

  // Show loading while joining traditional meeting
  if (!currentParticipant || !currentParticipant.is_online) {
    if ((isJoining || (autoJoinAttempted && participants.length > 0)) && !showRoomFullDialog) {
      return (
        <div className="h-screen flex items-center justify-center bg-gray-900">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-white">{currentParticipant ? "Reconnecting..." : "Joining meeting..."}</p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Traditional Meeting Room
  return (
    <>
      {/* Room Full Dialog */}
      <AlertDialog open={showRoomFullDialog} onOpenChange={setShowRoomFullDialog}>
          <AlertDialogContent className="sm:max-w-[425px]">
            <AlertDialogHeader>
              <div className="flex flex-col items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-center">
                  <AlertDialogTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Phòng đã đầy
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-base text-gray-600 dark:text-gray-300">
                    Phòng này đã đạt số lượng người tham gia tối đa
                  </AlertDialogDescription>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {onlineParticipantsCount} / {meeting.max_participants} người
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Vui lòng thử lại sau hoặc tham gia phòng khác
                </p>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center mt-4">
              <AlertDialogAction
                onClick={() => {
                  setShowRoomFullDialog(false);
                  router.push("/meetings");
                }}
                className="w-full sm:w-auto !bg-blue-600 hover:!bg-blue-700 !text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay về danh sách phòng
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <MeetingHeader
        meetingTitle={meeting.title}
        onlineParticipantsCount={onlineParticipantsCount}
        maxParticipants={meeting.max_participants}
        isConnected={isConnected}
        showParticipants={showParticipants}
        showChat={showChat}
        showYouTubeSearch={showYouTubeSearch}
        onToggleParticipants={() => { setShowParticipants(true); setShowChat(false); setShowFunctions(false); }}
        onToggleChat={() => { setShowChat(true); setShowParticipants(false); setShowFunctions(false); setShowYouTubeSearch(false); }}
        onToggleYouTubeSearch={() => { 
          setShowYouTubeSearch(!showYouTubeSearch); 
          setShowParticipants(false); 
          setShowChat(false); 
          setShowFunctions(false); 
        }}
      />
      {showConnectionBanner && (
        <div className="bg-yellow-600 text-white px-4 py-2 text-sm flex items-center justify-between">
          <span>⚠️ Connection lost. Reconnecting...</span>
        </div>
      )}

      {/* Main Content - Between header and controls */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Video Area - clean without overlay buttons */}
        <div className="flex-1 bg-gray-900 flex flex-col min-w-0">
          <div className="flex-1 overflow-auto p-4 min-h-0">
            {(() => {
              console.log('🎥 [MeetingRoom] Rendering:', {
                showVideoGrid,
                isHost,
                hasSocket: !!socket,
                socketConnected: socket?.connected,
                meetingYoutubeData: {
                  videoId: youtubeVideoId,
                  currentTime: youtubeCurrentTime,
                  isPlaying: youtubeIsPlaying,
                }
              });
              
              return (
                <div className="h-full">
                  <div className={showVideoGrid ? "h-full" : "hidden"}>
                    <VideoGrid
                      localStream={localStream}
                      peers={peers}
                      participants={participants}
                      currentUserId={user.id}
                      isMuted={isMuted}
                      isVideoOff={isVideoOff}
                      spotlightUserId={spotlightUserId || undefined}
                      isScreenSharing={isScreenSharing}
                    />
                  </div>
                  <div className={showVideoGrid ? "hidden" : "h-full"}>
                    <YouTubePlayer
                      ref={youtubePlayerRef}
                      socket={socket}
                      isHost={isHost}
                      initialVideoId={youtubeVideoId || undefined}
                      initialCurrentTime={youtubeCurrentTime}
                      initialIsPlaying={youtubeIsPlaying}
                      volume={youtubeVolume}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Sidebar - Fixed width */}
        <div className="w-80 bg-gray-800 flex flex-col border-l border-gray-700 flex-shrink-0">
          {/* Tab buttons */}
          <div className="flex border-b border-gray-700 flex-shrink-0 hidden">
            <button
              className={`flex-1 p-2 transition-colors ${
                showParticipants ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
              }`}
              onClick={() => { setShowParticipants(true); setShowChat(false); setShowFunctions(false); }}
            >
              <Users className="w-5 h-5 mx-auto" />
            </button>
            <button
              className={`flex-1 p-2 transition-colors ${
                showChat ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
              }`}
              onClick={() => { setShowChat(true); setShowParticipants(false); setShowFunctions(false); }}
            >
              <MessageSquare className="w-5 h-5 mx-auto" />
            </button>
            <button
              className={`flex-1 p-2 transition-colors ${
                showFunctions ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
              }`}
              onClick={() => { setShowFunctions(true); setShowParticipants(false); setShowChat(false); }}
            >
              <Play className="w-5 h-5 mx-auto" />
            </button>
          </div>

          {/* Tab content - Fill remaining space */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {showParticipants && (
              <MeetingParticipantsPanel
                participants={participants}
                currentUserId={user.id}
                isHost={isHost}
                socket={socket}
                onKickParticipant={handleKickParticipant}
                onBlockParticipant={handleBlockParticipant}
              />
            )}

            {showChat && (
              <MeetingChatPanel
                messages={chatMessages}
                isOnline={isOnline}
                currentUserId={user.id}
                onSendMessage={handleSendMessage}
              />
            )}

            {showYouTubeSearch && (
              <div className="flex-1 flex flex-col overflow-hidden bg-[#0f0f0f]">
                {/* Player Controls - At top of sidebar */}
                {youtubeVideoId && (
                  <div className="p-4 border-b border-gray-800 bg-[#0f0f0f] flex-shrink-0">
                    <div className="flex flex-col gap-3">
                      {/* Host Controls */}
                      {isHost && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleYoutubeTogglePlay}
                            className="flex-1 bg-[#272727] hover:bg-[#3f3f3f] text-white border-0"
                          >
                            {youtubeIsPlaying ? (
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
                            onClick={handleYoutubeClear}
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
                          onClick={handleYoutubeMute}
                          className="text-gray-300 hover:text-white p-0 h-auto"
                        >
                          {youtubeVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </Button>
                        <Slider
                          value={[youtubeVolume]}
                          onValueChange={(v) => setYoutubeVolume(v[0])}
                          min={0}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-300 min-w-[36px] text-right">{youtubeVolume}%</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* YouTube Search Content - Below controls */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <YouTubeSearchModal
                    open={true}
                    onClose={() => {}}
                    onSelectVideo={handleYoutubeSelectVideo}
                    isHost={isHost}
                    currentVideoId={youtubeVideoId}
                    isPlaying={youtubeIsPlaying}
                    volume={youtubeVolume}
                    onTogglePlay={handleYoutubeTogglePlay}
                    onClear={handleYoutubeClear}
                    onVolumeChange={setYoutubeVolume}
                    onMute={handleYoutubeMute}
                    embedded={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls - Fixed at bottom */}
      <div className="h-14 bg-gray-800 p-2 flex items-center justify-between flex-shrink-0 border-t border-gray-700">
        {/* Left side: Main controls */}
        
        {/* Left side - Bandwidth monitoring (Phase 3: Real data) */}
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              aggregatedMetrics.quality === 'excellent' ? 'bg-green-500' :
              aggregatedMetrics.quality === 'good' ? 'bg-blue-500' :
              aggregatedMetrics.quality === 'fair' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
            <span className="text-xs">Quality</span>
          </div>
          
          {statsWorkerReady && aggregatedMetrics.downloadBitrate > 0 ? (
            <>
              <div className="flex items-center gap-1">
                <ArrowDown className="w-3 h-3 text-blue-400" />
                <span className="text-xs">{formatBandwidth(aggregatedMetrics.downloadBitrate)}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3 text-green-400" />
                <span className="text-xs">{formatBandwidth(aggregatedMetrics.uploadBitrate)}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">Latency:</span>
                <span className="text-xs">{aggregatedMetrics.latency}ms</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <ArrowDown className="w-3 h-3 text-blue-400" />
                <span className="text-xs">-- KB/s</span>
              </div>
              
              <div className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3 text-green-400" />
                <span className="text-xs">-- KB/s</span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">Latency:</span>
                <span className="text-xs">-- ms</span>
              </div>
            </>
          )}
        </div>

        {/* Center - Main Controls */}
        <div className="flex justify-center items-center gap-3">
          {/* 🔥 FIX: Mic button with white background and clear visibility */}
          <Button
            onClick={toggleMute}
            className={`rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg transition-all ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-white hover:bg-gray-100 text-gray-900'
            }`}
            aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          
          {/* 🔥 FIX: Video button with white background and clear visibility */}
          <Button
            onClick={toggleVideo}
            className={`rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg transition-all ${
              isVideoOff 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-white hover:bg-gray-100 text-gray-900'
            }`}
            aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </Button>

          {/* Screen Share button */}
          <Button
            onClick={toggleScreenShare}
            className={`rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-lg transition-all ${
              isScreenSharing
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-white hover:bg-gray-100 text-gray-900'
            }`}
            aria-label={isScreenSharing ? "Stop screen share" : "Start screen share"}
          >
            <MonitorUp className="w-4 h-4" />
          </Button>

          {/* Spacer */}
          <div className="w-6" />

          {/* YouTube / Video Grid toggles (small controls, aligned with mic/cam/share) */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showVideoGrid ? 'secondary' : 'default'}
              onClick={() => setShowVideoGrid(false)}
              className={`h-10 px-3 ${showVideoGrid ? 'bg-gray-700 text-gray-100' : 'bg-red-600 hover:bg-red-700 text-white'}`}
              aria-label="Switch to YouTube"
              title="YouTube"
            >
              <Play className="w-4 h-4 mr-1" />
              YouTube
            </Button>
            <Button
              size="sm"
              variant={!showVideoGrid ? 'secondary' : 'default'}
              onClick={() => setShowVideoGrid(true)}
              className={`h-10 px-3 ${!showVideoGrid ? 'bg-gray-700 text-gray-100' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              aria-label="Switch to Video Grid"
              title="Video Grid"
            >
              <Video className="w-4 h-4 mr-1" />
              Video Grid
            </Button>

            {/* Moved: reload/lock/leave on the right */}
            {onReconnect && (
              <Button size="icon" variant="outline" onClick={onReconnect} className="w-10 h-10">
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            {isHost && (
              <Button size="icon" variant="outline" onClick={handleToggleLock} className="w-10 h-10">
                {meeting.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </Button>
            )}
            <Button size="icon" onClick={() => setConfirmLeaveOpen(true)} className="w-10 h-10 rounded-md bg-red-600 hover:bg-red-700 text-white" aria-label="Leave">
              <PhoneOff className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Right side - Message Input */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              ref={chatInputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleChatInputKeyPress}
              placeholder={isOnline ? "Send a message to everyone" : "Join meeting to chat"}
              disabled={!isOnline || isSending}
              className="pl-4 pr-12 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
            />
            
            {/* Emoji picker button */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white hover:bg-gray-600 w-8 h-8 p-0"
                  disabled={!isOnline}
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" className="w-80 p-2 bg-gray-800 border-gray-700">
                <div className="grid grid-cols-8 gap-1">
                  {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '👍', '👎', '👏', '🙌', '👋', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '🤏', '✨', '🎉'].map((emoji) => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-lg hover:bg-gray-700"
                      onClick={() => {
                        setNewMessage(prev => prev + emoji);
                        setShowEmojiPicker(false);
                        chatInputRef.current?.focus();
                      }}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Send button */}
          <Button
            onClick={handleChatInputSend}
            disabled={!newMessage.trim() || !isOnline || isSending}
            size="sm"
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Meeting Bandwidth Monitor - Floating Widget */}
{/* Bandwidth monitor removed - now in bottom controls */}



      {/* MeetingDialogs component handles all dialogs (including Room Full Dialog) */}
      <MeetingDialogs
        confirmLeaveOpen={confirmLeaveOpen}
        setConfirmLeaveOpen={setConfirmLeaveOpen}
        onConfirmLeave={handleLeaveMeeting}
        confirmKickOpen={confirmKickOpen}
        setConfirmKickOpen={setConfirmKickOpen}
        targetParticipant={targetParticipant}
        setTargetParticipant={setTargetParticipant}
        onConfirmKick={confirmKickParticipant}
        confirmBlockOpen={confirmBlockOpen}
        setConfirmBlockOpen={setConfirmBlockOpen}
        onConfirmBlock={confirmBlockParticipant}
        showRoomFullDialog={showRoomFullDialog}
        setShowRoomFullDialog={setShowRoomFullDialog}
        onlineParticipantsCount={onlineParticipantsCount}
        maxParticipants={meeting.max_participants}
        isPublicMeeting={isPublicMeeting}
        blockedModalOpen={blockedModalOpen}
        blockedMessage={blockedMessage}
        setBlockedModalOpen={setBlockedModalOpen}
      />
      </div>
    </>
  );
}