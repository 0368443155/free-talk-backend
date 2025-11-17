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
import { VideoGrid } from "./video-grid";
import { MeetingChat } from "./meeting-chat";
import { YouTubePlayer, YouTubePlayerHandle } from "./youtube-player";
import { YouTubeSearchModal } from "@/components/youtube-search-modal";
import { Slider } from "@/components/ui/slider";
import { BandwidthMonitor } from "@/components/bandwidth-monitor";
import { useMeetingBandwidthReporter } from "@/hooks/use-meeting-bandwidth-reporter";
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
  const [participants, setParticipants] = useState<IMeetingParticipant[]>([]);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [confirmKickOpen, setConfirmKickOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [targetParticipant, setTargetParticipant] = useState<{ id: string; name: string } | null>(null);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<IMeetingChatMessage[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showFunctions, setShowFunctions] = useState(false);
  const [showVideoGrid, setShowVideoGrid] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  const [participantsFetched, setParticipantsFetched] = useState(false);
  const [showRoomFullDialog, setShowRoomFullDialog] = useState(false);
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);
  const [youtubeVolume, setYoutubeVolume] = useState(50);
  const youtubePlayerRef = useRef<YouTubePlayerHandle | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(meeting.youtube_video_id ?? null);
  const [youtubeIsPlaying, setYoutubeIsPlaying] = useState<boolean>(!!meeting.youtube_is_playing);
  const [youtubeCurrentTime, setYoutubeCurrentTime] = useState<number>(meeting.youtube_current_time ?? 0);
  const { toast } = useToast();
  const router = useRouter();
  const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null);
  
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

  const isHost = meeting.host?.id === user.id;
  const isPublicMeeting = !classroomId;

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

  // Meeting socket connection
  const { socket, isConnected, connectionError } = useMeetingSocket({
    meetingId: meeting.id,
    userId: user.id, // 🔥 FIX: Use user.id instead of user.user_id
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

  // Report bandwidth to global monitoring
  const peerConnection = getFirstPeerConnection();
  console.log(`📊 [MEETING-ROOM] Bandwidth reporter debug:`);
  console.log(`  - Meeting ID: ${meeting.id.slice(0, 8)}`);
  console.log(`  - Meeting Title: ${meeting.title}`);
  console.log(`  - Participants: ${participants.length}`);
  console.log(`  - PeerConnection:`, peerConnection);
  console.log(`  - PeerConnection state:`, peerConnection?.connectionState);
  console.log(`  - PeerConnection ice state:`, peerConnection?.iceConnectionState);
  
  const { isReporting } = useMeetingBandwidthReporter({
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    peerConnection: peerConnection,
    participantCount: participants.length,
    userId: user.id,
    username: user.name,
    enabled: true
  });

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

  useEffect(() => {
    fetchParticipants();
    fetchChatMessages();

    const interval = setInterval(() => {
      fetchParticipants();
      fetchChatMessages();
    }, 10000); // Increase polling interval from 5s to 10s to reduce latency

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleYouTubeSync = (data: { videoId: string; currentTime: number; isPlaying: boolean }) => {
      setYoutubeVideoId(data.videoId || null);
      setYoutubeCurrentTime(typeof data.currentTime === "number" ? data.currentTime : 0);
      setYoutubeIsPlaying(!!data.isPlaying);
    };

    const handleYouTubePlay = (data: { videoId?: string; currentTime: number }) => {
      if (data.videoId) {
        setYoutubeVideoId(data.videoId);
      }
      if (typeof data.currentTime === "number") {
        setYoutubeCurrentTime(data.currentTime);
      }
      setYoutubeIsPlaying(true);
    };

    const handleYouTubePause = (data: { currentTime: number }) => {
      if (typeof data.currentTime === "number") {
        setYoutubeCurrentTime(data.currentTime);
      }
      setYoutubeIsPlaying(false);
    };

    const handleYouTubeSeek = (data: { currentTime: number }) => {
      if (typeof data.currentTime === "number") {
        setYoutubeCurrentTime(data.currentTime);
      }
    };

    const handleYouTubeClear = () => {
      setYoutubeVideoId(null);
      setYoutubeIsPlaying(false);
      setYoutubeCurrentTime(0);
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
  }, [socket]);

  // 🔥 FIX: Optimized chat setup with useCallback for event handlers
  const handleChatMessage = useCallback((data: {
    id: string;
    message: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    timestamp: string;
    type?: string;
  }) => {
    console.log('💬 [CHAT] Received message:', data.id, 'from', data.senderName);

    const newMsg: IMeetingChatMessage = {
      id: data.id,
      message: data.message,
      sender: {
        user_id: data.senderId,
        name: data.senderName,
        avatar_url: data.senderAvatar,
      } as any,
      type: (data.type as MessageType) || MessageType.TEXT,
      created_at: data.timestamp,
      metadata: null,
    } as any;

    setChatMessages(prev => {
      const exists = prev.some(msg => msg.id === newMsg.id);
      if (exists) return prev;
      return [...prev, newMsg];
    });
  }, []);

  const handleChatError = useCallback((data: { message: string }) => {
    console.error('❌ [CHAT] Error:', data.message);
    toast({
      title: "Chat Error",
      description: data.message,
      variant: "destructive",
    });
  }, [toast]);

  // 🔥 FIX: Simplified chat effect with stable dependencies
  useEffect(() => {
    if (!socket) return;

    socket.on('chat:message', handleChatMessage);
    socket.on('chat:error', handleChatError);

    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:error', handleChatError);
    };
  }, [socket, handleChatMessage, handleChatError]);

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
      if (data.userId === user.id && data.isMuted) {
        // Host muted me - force mute if not already muted
        if (!isMuted) {
          toggleMute();
        }
        toast({ 
          title: "You have been muted by the host", 
          description: "Your microphone has been turned off.",
          variant: "default" 
        });
      }
    };

    const handleForceVideoOff = (data: { userId: string; isVideoOff: boolean }) => {
      if (data.userId === user.id && data.isVideoOff) {
        // Host turned off my camera - force video off if not already off
        if (!isVideoOff) {
          toggleVideo();
        }
        toast({ 
          title: "Your camera has been turned off", 
          description: "The host has disabled your camera.",
          variant: "default" 
        });
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

  // 🔥 FIX: Optimized handleSendMessage with stable dependencies
  const handleSendMessage = useCallback(async (message: string) => {
    if (!socket?.connected) {
      toast({
        title: "Connection Error",
        description: "Please wait for connection...",
        variant: "destructive",
      });
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    try {
      socket.emit('chat:message', { message: trimmedMessage });
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send message.",
        variant: "destructive",
      });
    }
  }, [socket, toast]);

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

  // Auto-join logic
  useEffect(() => {
    const isOnlineCheck = currentParticipant?.is_online;
    console.log("Auto-join check:", {
      autoJoinAttempted,
      participantsFetched,
      hasCurrentParticipant: !!currentParticipant,
      isOnlineCheck,
      isJoining
    });

    if (!autoJoinAttempted && participantsFetched && (!currentParticipant || !isOnlineCheck) && !isJoining) {
      console.log("Triggering auto-join...");
      setAutoJoinAttempted(true);
      handleJoinMeeting();
    }
  }, [participantsFetched, currentParticipant, autoJoinAttempted, isJoining]);

  const fetchParticipants = async () => {
    try {
      const data = isPublicMeeting
        ? await getPublicMeetingParticipantsApi(meeting.id)
        : await getMeetingParticipantsApi(classroomId!, meeting.id);

      // Remove excessive participant logging
      // console.log("✅ Fetched participants:", {
      //   total: data.length,
      //   online: data.filter((p: any) => p.is_online).length,
      //   currentUser: data.find((p: any) => p.user.id === user.id || p.user.user_id === user.id),
      //   allParticipants: data.map((p: any) => ({
      //     id: p.id,
      //     userId: p.user?.id,
      //     userUserId: p.user?.user_id,
      //     name: p.user?.name,
      //     online: p.is_online,
      //   })),
      // });

      setParticipants(data);
      setParticipantsFetched(true);
    } catch (error) {
      console.error("Failed to fetch participants:", error);
      setParticipantsFetched(true);
    }
  };

  const fetchChatMessages = async () => {
    try {
      const response = isPublicMeeting
        ? await getPublicMeetingChatApi(meeting.id, { page: 1, limit: 100 })
        : await getMeetingChatApi(classroomId!, meeting.id, { page: 1, limit: 100 });
      
      console.log("✅ Fetched chat messages:", response.data.length);
      setChatMessages(response.data.reverse());
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    }
  };

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

  // YouTube handlers
  const handleYoutubeSelectVideo = (videoId: string) => {
    if (!isHost) return;

    console.log("🎬 Host selected video:", videoId);
    setShowVideoGrid(false);
    setYoutubeVideoId(videoId);
    setYoutubeCurrentTime(0);
    setYoutubeIsPlaying(true);

    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.handleSelectVideo(videoId, 0);
    } else if (socket) {
      socket.emit("youtube:play", {
        videoId,
        currentTime: 0,
      });
    }
  };

  const handleYoutubeTogglePlay = () => {
    if (!isHost || !youtubeVideoId) return;

    console.log(`🎬 Toggle: ${youtubeIsPlaying ? 'Pause' : 'Play'} | VideoID: ${youtubeVideoId}`);

    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.handleTogglePlay();
    } else if (socket) {
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

    setYoutubeIsPlaying(prev => !prev);
  };

  const handleYoutubeClear = () => {
    if (!isHost) return;

    console.log("❌ Host clearing video");
    setYoutubeVideoId(null);
    setYoutubeIsPlaying(false);
    setYoutubeCurrentTime(0);

    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.handleClearVideo();
    } else if (socket) {
      socket.emit("youtube:clear");
    }
  };

  const handleYoutubeMute = () => {
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.handleToggleMute();
    }
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

  const handleKickParticipant = (participantId: string, participantName: string) => {
    setTargetParticipant({ id: participantId, name: participantName });
    setConfirmKickOpen(true);
  };

  const confirmKickParticipant = () => {
    if (!targetParticipant) return;
    socket?.emit('admin:kick-user', { 
      targetUserId: targetParticipant.id, 
      reason: 'Kicked by host' 
    });
    toast({
      title: "Participant Kicked",
      description: `${targetParticipant.name} has been removed from the meeting.`,
      variant: "default",
    });
    setConfirmKickOpen(false);
    setTargetParticipant(null);
  };

  const handleBlockParticipant = (participantId: string, participantName: string) => {
    setTargetParticipant({ id: participantId, name: participantName });
    setConfirmBlockOpen(true);
  };

  const confirmBlockParticipant = () => {
    if (!targetParticipant) return;
    socket?.emit('admin:block-user', { 
      targetUserId: targetParticipant.id, 
      reason: 'Blocked by host' 
    });
    toast({
      title: "Participant Blocked",
      description: `${targetParticipant.name} has been blocked from the meeting.`,
      variant: "default",
    });
    setConfirmBlockOpen(false);
    setTargetParticipant(null);
  };


  const getRoleIcon = (role: ParticipantRole) => {
    if (role === ParticipantRole.HOST) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (role === ParticipantRole.MODERATOR) return <Shield className="w-4 h-4 text-blue-500" />;
    return null;
  };

  // 🔥 FIX: Show loading while joining
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

    return (
      <>
        <div className="h-screen flex items-center justify-center bg-gray-900">
          <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-white text-center">{meeting.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-gray-400">
                <p className="mb-2">Meeting is live</p>
                <p className="text-sm">
                  {onlineParticipantsCount} / {meeting.max_participants} participants
                </p>
                {meeting.is_locked && (
                  <Badge variant="destructive" className="mt-2">Meeting is locked</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleJoinMeeting}
                  disabled={isJoining || (meeting.is_locked && !isHost)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {isJoining ? "Joining..." : "Join Meeting"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = isPublicMeeting ? "/meetings" : `/classrooms/${classroomId}`}
                >
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header - Fixed at top (narrowed to exclude sidebar) */}
      <div className="bg-gray-800 px-2 py-1 flex items-center justify-between flex-shrink-0 border-b border-gray-700 pr-80">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-bold text-white">{meeting.title} - {onlineParticipantsCount} / {meeting.max_participants} participants</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
        {/* Header navigation for participants / chat / functions */}
        <div className="flex items-center gap-2">
          <button
            className={`p-2 rounded ${showParticipants ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
            title="Participants"
            onClick={() => { setShowParticipants(true); setShowChat(false); setShowFunctions(false); }}
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            className={`p-2 rounded ${showChat ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
            title="Chat"
            onClick={() => { setShowChat(true); setShowParticipants(false); setShowFunctions(false); setShowYouTubeSearch(false); }}
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            className={`p-2 rounded ${showYouTubeSearch ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
            title="YouTube"
            onClick={() => { 
              setShowYouTubeSearch(!showYouTubeSearch); 
              setShowParticipants(false); 
              setShowChat(false); 
              setShowFunctions(false); 
            }}
          >
            <Play className="w-5 h-5" />
          </button>
        </div>
        {showConnectionBanner && (
          <div className="bg-yellow-600 text-white px-4 py-2 text-sm flex items-center justify-between">
            <span>⚠️ Connection lost. Reconnecting...</span>
          </div>
        )}
      </div>

      {/* Main Content - Between header and controls */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Video Area */}
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
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  {participants.map((participant) => {
                    const participantUserId = participant.user.id || participant.user.user_id;
                    const isCurrentUser = participantUserId === user.id;
                    const canManageParticipant = isHost && !isCurrentUser && participant.role !== ParticipantRole.HOST;

                    return (
                      <div key={participant.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                        <div className="flex items-center gap-2 flex-1">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={participant.user.avatar_url} />
                            <AvatarFallback>{participant.user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-1">
                              {getRoleIcon(participant.role)}
                              <span className="text-sm text-white">{participant.user.name}</span>
                              {isCurrentUser && <span className="text-xs text-gray-400">(You)</span>}
                            </div>
                            <Badge variant={participant.is_online ? "default" : "secondary"} className="text-xs">
                              {participant.is_online ? "Online" : "Offline"}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Host actions: Kick and Block buttons */}
                        {canManageParticipant && participant.is_online && (
                          <div className="flex items-center gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-600"
                                  title="Manage participant"
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-2 bg-gray-800 border-gray-700" align="end">
                                <div className="flex flex-col gap-1">
                                  {/* Media controls */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full justify-start text-orange-400 hover:text-orange-300 hover:bg-gray-700"
                                    onClick={() => {
                                      socket?.emit('admin:mute-user', { 
                                        targetUserId: participantUserId, 
                                        mute: true 
                                      });
                                      toast({ title: `Muted ${participant.user.name}` });
                                    }}
                                  >
                                    <MicOff className="w-4 h-4 mr-2" />
                                    Mute mic
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full justify-start text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                                    onClick={() => {
                                      socket?.emit('admin:video-off-user', { 
                                        targetUserId: participantUserId, 
                                        videoOff: true 
                                      });
                                      toast({ title: `Turned off ${participant.user.name}'s camera` });
                                    }}
                                  >
                                    <VideoOff className="w-4 h-4 mr-2" />
                                    Turn off camera
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full justify-start text-purple-400 hover:text-purple-300 hover:bg-gray-700"
                                    onClick={() => {
                                      socket?.emit('admin:stop-share-user', { 
                                        targetUserId: participantUserId 
                                      });
                                      toast({ title: `Stopped ${participant.user.name}'s screen share` });
                                    }}
                                  >
                                    <MonitorUp className="w-4 h-4 mr-2" />
                                    Stop screen share
                                  </Button>
                                  
                                  {/* Separator */}
                                  <div className="h-px bg-gray-600 my-1" />
                                  
                                  {/* Room management */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full justify-start text-yellow-400 hover:text-yellow-300 hover:bg-gray-700"
                                    onClick={() => handleKickParticipant(participantUserId, participant.user.name)}
                                  >
                                    <UserX className="w-4 h-4 mr-2" />
                                    Kick
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-gray-700"
                                    onClick={() => handleBlockParticipant(participantUserId, participant.user.name)}
                                  >
                                    <VolumeX className="w-4 h-4 mr-2" />
                                    Block
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {showChat && (
              <>
                {!isOnline && (
                  <div className="bg-gray-700 px-3 py-2 text-xs text-yellow-300 text-center flex-shrink-0">
                    Chat disconnected. Messages will send when reconnected.
                  </div>
                )}
                <MeetingChat
                  messages={chatMessages}
                  isOnline={isOnline}
                  currentUserId={user.id}
                  onSendMessage={handleSendMessage}
                />
              </>
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
      <div className="h-14 bg-gray-800 p-2 flex items-center gap-3 flex-shrink-0 border-t border-gray-700">
        {/* Left side: Main controls */}
        <div className="flex-1 flex justify-center items-center gap-3">
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

        {/* Right side: Chat input (only when showChat is true) */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 p-2 flex items-center gap-2">
            <div className="flex-1 relative">
              {/* Emoji picker */}
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-gray-300 hover:text-white hover:bg-gray-600 disabled:opacity-50 inline-flex items-center justify-center transition-colors transition-transform duration-150 hover:scale-[0.8]"
                    disabled={!isOnline || isSending}
                    aria-label="Insert emoji"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-80 h-96 p-0 bg-gray-800 border-gray-700"
                  align="start"
                  side="top"
                >
                  <div className="flex flex-col h-full">
                    <div className="px-4 py-2 border-b border-gray-700">
                      <h3 className="text-sm font-semibold text-white">Emoji</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="grid grid-cols-8 gap-2">
                        {ALL_EMOJIS.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              handleEmojiClick(emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-gray-700 rounded-lg transition-colors cursor-pointer active:scale-90"
                            type="button"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Input
                ref={chatInputRef}
                placeholder={isOnline ? "Send a message to everyone" : "Join meeting to chat"}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleChatInputKeyPress}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus-visible:ring-blue-500 rounded-full pl-4 pr-12 py-2.5"
                disabled={!isOnline || isSending}
                maxLength={1000}
              />
            </div>
            <Button
              onClick={handleChatInputSend}
              disabled={!isOnline || !newMessage.trim() || isSending}
              className="rounded-full w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 flex-shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Bandwidth Monitor - Floating Widget */}
      <div className="fixed bottom-24 right-4 z-40 w-80">
        <BandwidthMonitor 
          peerConnection={getFirstPeerConnection()} 
          enabled={isOnline && peers.size > 0}
        />
      </div>



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

      {/* Confirm Leave Modal */}
      <Dialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave meeting?</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this meeting now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeaveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleLeaveMeeting}>Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Kick Modal */}
      <Dialog open={confirmKickOpen} onOpenChange={setConfirmKickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kick participant?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{targetParticipant?.name}</strong> from this meeting? They will be able to rejoin later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmKickOpen(false); setTargetParticipant(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={confirmKickParticipant}>Kick</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Block Modal */}
      <Dialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block participant?</DialogTitle>
            <DialogDescription>
              Are you sure you want to block <strong>{targetParticipant?.name}</strong>? They will be removed and cannot rejoin this meeting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmBlockOpen(false); setTargetParticipant(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={confirmBlockParticipant}>Block</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocked User Modal */}
      <Dialog open={blockedModalOpen} onOpenChange={() => {}} modal={true}>
        <DialogContent 
          className="max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-red-600 text-xl font-bold">Access Denied</DialogTitle>
            <DialogDescription className="text-gray-700 whitespace-pre-line mt-2">
              {blockedMessage || 'You have been blocked from this meeting and cannot join.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button 
              onClick={() => {
                setBlockedModalOpen(false);
                window.location.href = '/dashboard';
              }} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Back to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}