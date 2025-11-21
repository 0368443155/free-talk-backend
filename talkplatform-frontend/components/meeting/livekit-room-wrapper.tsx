"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useLiveKit, LiveKitParticipant } from '@/hooks/use-livekit';
import { useMeetingSocket } from '@/hooks/use-meeting-socket';
import { WaitingRoomHostPanel } from './waiting-room-host-panel';
import { GreenRoom, DeviceSettings } from './green-room';
import { MeetingControls } from './meeting-controls';
import { useReactions } from './reaction-overlay';
import { MeetingChat } from '../../section/meetings/meeting-chat';
import { LiveKitBandwidthMonitor } from './livekit-bandwidth-monitor';
import { YouTubePlayer, YouTubePlayerHandle } from '../../section/meetings/youtube-player';
import { YouTubeSearchModal } from '../youtube-search-modal';
import { 
  IMeetingChatMessage, 
  MessageType, 
  IMeetingParticipant, 
  ParticipantRole, 
  getMeetingParticipantsApi, 
  getPublicMeetingParticipantsApi, 
  getMeetingChatApi, 
  getPublicMeetingChatApi, 
  joinMeetingApi, 
  joinPublicMeetingApi, 
  leaveMeetingApi, 
  leavePublicMeetingApi, 
  kickParticipantApi, 
  kickPublicMeetingParticipantApi, 
  blockPublicMeetingParticipantApi, 
  muteParticipantApi, 
  mutePublicMeetingParticipantApi 
} from '@/api/meeting.rest';
import { generateLiveKitTokenApi } from '@/api/livekit.rest';
import {
  VideoOff,
  MicOff,
  MessageSquare,
  X,
  Play,
  Users,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  Crown,
  Shield,
  UserX,
  Smile,
  Send,
  Loader2,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Pause,
  MonitorUp,
  PhoneOff,
  Video,
  Mic,
} from 'lucide-react';

interface LiveKitRoomWrapperProps {
  meetingId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  onLeave: () => void;
  isHost?: boolean;
  isPublicMeeting?: boolean;
  classroomId?: string;
}

interface WaitingParticipant {
  userId: string;
  username: string;
  email: string;
  waitingTime: number;
  isConnected: boolean;
}

/**
 * UC-05: Main LiveKit SFU Room Component
 * Integrates Green Room, Waiting Room, LiveKit video conferencing, Socket.IO for chat/YouTube sync
 */
export function LiveKitRoomWrapper({
  meetingId,
  user,
  onLeave,
  isHost = false,
  isPublicMeeting = true,
  classroomId,
}: LiveKitRoomWrapperProps) {
  // State management
  const [phase, setPhase] = useState<'green-room' | 'waiting' | 'meeting'>('green-room');
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitWsUrl, setLivekitWsUrl] = useState<string>('');
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings | null>(null);
  const [waitingMessage, setWaitingMessage] = useState<string>('');
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showHostControls, setShowHostControls] = useState(false);
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([]);
  const [isWaitingRoomEnabled, setIsWaitingRoomEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showPlayControls, setShowPlayControls] = useState(false);
  const [showVideoGrid, setShowVideoGrid] = useState(true);
  const [chatMessages, setChatMessages] = useState<IMeetingChatMessage[]>([]);
  const [bandwidth, setBandwidth] = useState({
    inbound: 0,
    outbound: 0,
    latency: 0,
    quality: 'good' as 'excellent' | 'good' | 'poor',
  });

  // YouTube Player state
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeIsPlaying, setYoutubeIsPlaying] = useState(false);
  const [youtubeCurrentTime, setYoutubeCurrentTime] = useState(0);
  const [youtubeVolume, setYoutubeVolume] = useState(50);
  const youtubePlayerRef = useRef<YouTubePlayerHandle | null>(null);

  // Participants state
  const [participants, setParticipants] = useState<IMeetingParticipant[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [participantsFetched, setParticipantsFetched] = useState(false);
  const [confirmKickOpen, setConfirmKickOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [targetParticipant, setTargetParticipant] = useState<{ id: string; name: string } | null>(null);

  // Chat input state
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { addReaction, ReactionOverlay: ReactionComponent } = useReactions();

  // Check if user is online participant
  const currentParticipant = useMemo(() => {
    return participants.find(p => {
      const participantUserId = p.user?.id || (p.user as any)?.user_id;
      return participantUserId === user.id;
    });
  }, [participants, user.id]);

  const isOnline = useMemo(() => {
    return currentParticipant ? (currentParticipant.is_online !== false) : false;
  }, [currentParticipant]);

  // Socket.IO connection for chat, YouTube sync, and participant management
  const { socket, isConnected: isSocketConnected, connectionError: socketError } = useMeetingSocket({
    meetingId: meetingId,
    userId: user.id,
    isOnline,
  });

  // LiveKit hook
  const {
    room,
    isConnected: isLiveKitConnected,
    isConnecting,
    error: livekitError,
    localParticipant,
    participants: livekitParticipants,
    enableCamera,
    enableMicrophone,
    startScreenShare,
    stopScreenShare,
    sendChatMessage: sendLiveKitChatMessage,
    sendReaction,
    disconnect,
  } = useLiveKit({
    token: livekitToken,
    serverUrl: livekitWsUrl,
    onConnected: () => {
      setPhase('meeting');
      toast({
        title: "Connected",
        description: "You have joined the meeting",
      });
    },
    onDisconnected: () => {
      onLeave();
    },
    onDataReceived: (payload, participant) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));

        if (data.type === 'chat') {
          setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            message: data.message,
            sender: {
              user_id: participant?.identity || 'unknown',
              name: participant?.name || 'Unknown',
            },
            created_at: new Date(data.timestamp).toISOString(),
            type: MessageType.TEXT
          }]);
        } else if (data.type === 'reaction') {
          addReaction(data.emoji, user.id);
        }
      } catch (e) {
        console.error('Failed to parse received data:', e);
      }
    }
  });

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    try {
      const data = isPublicMeeting
        ? await getPublicMeetingParticipantsApi(meetingId)
        : await getMeetingParticipantsApi(classroomId!, meetingId);
      setParticipants(data);
      setParticipantsFetched(true);
    } catch (error) {
      console.error("Failed to fetch participants:", error);
      setParticipantsFetched(true);
    }
  }, [meetingId, isPublicMeeting, classroomId]);

  // Fetch chat messages
  const fetchChatMessages = useCallback(async () => {
    try {
      const response = isPublicMeeting
        ? await getPublicMeetingChatApi(meetingId, { page: 1, limit: 100 })
        : await getMeetingChatApi(classroomId!, meetingId, { page: 1, limit: 100 });
      
      setChatMessages(prevMessages => {
        const fetchedMessages = response.data.reverse();
        const existingIds = new Set(prevMessages.map(msg => msg.id));
        const newMessages = fetchedMessages.filter(msg => !existingIds.has(msg.id));
        
        if (newMessages.length > 0) {
          const allMessages = [...prevMessages, ...newMessages].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          return allMessages;
        }
        return prevMessages;
      });
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    }
  }, [meetingId, isPublicMeeting, classroomId]);

  // Join meeting API
  const handleJoinMeeting = useCallback(async () => {
    if (currentParticipant?.is_online || isJoining) return;

    try {
      setIsJoining(true);
      if (isPublicMeeting) {
        await joinPublicMeetingApi(meetingId);
      } else {
        await joinMeetingApi(classroomId!, meetingId);
      }
      toast({ title: "Success", description: "Joined meeting successfully" });
      await fetchParticipants();
    } catch (error: any) {
      console.error("Failed to join meeting:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to join meeting",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  }, [currentParticipant, isJoining, isPublicMeeting, meetingId, classroomId, toast, fetchParticipants]);

  // Initial data fetch
  useEffect(() => {
    fetchParticipants();
    fetchChatMessages();

    const interval = setInterval(() => {
      fetchParticipants();
      fetchChatMessages();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchParticipants, fetchChatMessages]);

  // Auto-join when participant is fetched
  useEffect(() => {
    if (participantsFetched && !currentParticipant?.is_online && !isJoining && phase === 'meeting') {
      handleJoinMeeting();
    }
  }, [participantsFetched, currentParticipant, isJoining, phase, handleJoinMeeting]);

  // Socket.IO: YouTube sync events
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

  // Socket.IO: Chat events
  const handleChatMessage = useCallback((data: {
    id: string;
    message: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    timestamp: string;
    type?: string;
  }) => {
    const newMsg: IMeetingChatMessage = {
      id: data.id,
      message: data.message,
      sender: {
        user_id: data.senderId,
        name: data.senderName || 'Unknown User',
        avatar_url: data.senderAvatar || '',
      } as any,
      type: (data.type as MessageType) || MessageType.TEXT,
      created_at: data.timestamp || new Date().toISOString(),
      metadata: null,
    } as any;

    setChatMessages(prev => {
      const exists = prev.some(msg => msg.id === newMsg.id);
      if (exists) return prev;
      
      return [...prev, newMsg].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  const handleChatError = useCallback((data: { message: string }) => {
    toast({
      title: "Chat Error",
      description: data.message,
      variant: "destructive",
    });
  }, [toast]);

  useEffect(() => {
    if (!socket) return;

    socket.on('chat:message', handleChatMessage);
    socket.on('chat:error', handleChatError);

    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('chat:error', handleChatError);
    };
  }, [socket, handleChatMessage, handleChatError]);

  // Socket.IO: Participant updates
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = (data: { userId: string; userName?: string }) => {
      setParticipants(prev => {
        return prev.map(p => {
          const pid = p.user?.id || (p.user as any)?.user_id;
          if (pid === data.userId) {
            return { ...p, is_online: true } as IMeetingParticipant;
          }
          return p;
        });
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setParticipants(prev => prev.map(p => {
        const pid = p.user?.id || (p.user as any)?.user_id;
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

  // Socket.IO: Host moderation enforcement
  useEffect(() => {
    if (!socket) return;

    const handleForceMute = (data: { userId: string; isMuted: boolean }) => {
      if (data.userId === user.id && data.isMuted) {
        const videoTracks = Array.from(localParticipant?.audioTrackPublications.values() || []);
        const isEnabled = videoTracks.length > 0 && videoTracks[0].track !== undefined;
        if (isEnabled) {
          enableMicrophone(false);
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
        const videoTracks = Array.from(localParticipant?.videoTrackPublications.values() || []);
        const isEnabled = videoTracks.length > 0 && videoTracks[0].track !== undefined;
        if (isEnabled) {
          enableCamera(false);
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
        const isSharing = Array.from(localParticipant?.videoTrackPublications.values() || [])
          .some(pub => pub.source === 'screen_share');
        if (isSharing) {
          stopScreenShare();
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
        setTimeout(() => {
          disconnect();
          onLeave();
        }, 3000);
      }
    };

    const handleBlocked = (data: { userId: string; reason: string }) => {
      if (data.userId === user.id) {
        toast({
          title: "You have been blocked",
          description: data.reason + ". You cannot rejoin this meeting.",
          variant: "destructive",
        });
        setTimeout(() => {
          disconnect();
          onLeave();
        }, 3000);
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
  }, [socket, user.id, localParticipant, enableMicrophone, enableCamera, stopScreenShare, disconnect, onLeave, toast]);

  // Bandwidth monitoring
  useEffect(() => {
    if (!room || !isLiveKitConnected) return;

    const interval = setInterval(async () => {
      try {
        const mockInbound = Math.random() * 1000000 + 200000;
        const mockOutbound = Math.random() * 500000 + 100000;
        const mockLatency = Math.random() * 100 + 20;
        
        let quality: 'excellent' | 'good' | 'poor' = 'good';
        if (mockInbound > 500000 && mockLatency < 100) quality = 'excellent';
        else if (mockInbound < 100000 || mockLatency > 300) quality = 'poor';

        setBandwidth({
          inbound: Math.round(mockInbound),
          outbound: Math.round(mockOutbound),
          latency: Math.round(mockLatency),
          quality
        });
      } catch (e) {
        console.error('Failed to get stats:', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [room, isLiveKitConnected]);

  const handleJoin = async (settings: DeviceSettings) => {
    setDeviceSettings(settings);
    try {
      const data = await generateLiveKitTokenApi(meetingId);
      setLivekitToken(data.token);
      setLivekitWsUrl(data.wsUrl);
      setPhase('meeting');
    } catch (error) {
      console.error("Failed to get LiveKit token:", error);
      toast({
        title: "Error",
        description: "Failed to join meeting. Could not generate token.",
        variant: "destructive",
      });
    }
  };

  const handleLeave = () => {
    setShowLeaveDialog(true);
  };

  const confirmLeave = async () => {
    try {
      if (isPublicMeeting) {
        await leavePublicMeetingApi(meetingId);
      } else {
        await leaveMeetingApi(classroomId!, meetingId);
      }
    } catch (error) {
      console.error("Failed to leave meeting:", error);
    }
    disconnect();
    onLeave();
  };

  const handleToggleCamera = async () => {
    if (localParticipant) {
      const videoTracks = Array.from(localParticipant.videoTrackPublications.values());
      const isEnabled = videoTracks.length > 0 && videoTracks[0].track !== undefined;
      await enableCamera(!isEnabled);
    }
  };

  const handleToggleMicrophone = async () => {
    if (localParticipant) {
      const audioTracks = Array.from(localParticipant.audioTrackPublications.values());
      const isEnabled = audioTracks.length > 0 && audioTracks[0].track !== undefined;
      await enableMicrophone(!isEnabled);
    }
  };

  const handleToggleScreenShare = async () => {
    if (localParticipant) {
      const isSharing = Array.from(localParticipant.videoTrackPublications.values())
        .some(pub => pub.source === 'screen_share');
      if (isSharing) {
        await stopScreenShare();
      } else {
        await startScreenShare();
      }
    }
  };

  const handleSendChatMessage = useCallback(async (message: string) => {
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
      // Also send via LiveKit data channel as backup
      await sendLiveKitChatMessage(trimmedMessage);
      
      // Optimistically add to local state
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        message: trimmedMessage,
        sender: {
          user_id: user.id,
          name: user.username || 'You',
        },
        created_at: new Date().toISOString(),
        type: MessageType.TEXT
      }]);
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send message.",
        variant: "destructive",
      });
    }
  }, [socket, sendLiveKitChatMessage, user.id, user.username, toast]);

  const handleSendReaction = async (emoji: string) => {
    await sendReaction(emoji);
    if (socket?.connected) {
      socket.emit('chat:reaction', { emoji });
    }
    addReaction(emoji, user.id);
  };

  // YouTube handlers
  const handleYoutubeSelectVideo = (videoId: string) => {
    if (!isHost) return;
    setShowVideoGrid(false);
    setYoutubeVideoId(videoId);
    setYoutubeCurrentTime(0);
    setYoutubeIsPlaying(true);
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.handleSelectVideo(videoId, 0);
    }
    if (socket?.connected) {
      socket.emit("youtube:play", {
        videoId,
        currentTime: 0,
      });
    }
  };

  const handleYoutubeTogglePlay = () => {
    if (!isHost || !youtubeVideoId) return;
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.handleTogglePlay();
    }
    setYoutubeIsPlaying(prev => !prev);
  };

  const handleYoutubeClear = () => {
    if (!isHost) return;
    setYoutubeVideoId(null);
    setYoutubeIsPlaying(false);
    setYoutubeCurrentTime(0);
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.handleClearVideo();
    }
    if (socket?.connected) {
      socket.emit("youtube:clear");
    }
  };

  const handleYoutubeMute = () => {
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.handleToggleMute();
    }
    setYoutubeVolume(prev => (prev === 0 ? 50 : 0));
  };

  // Host participant management
  const handleKickParticipant = (participantId: string, participantName: string) => {
    setTargetParticipant({ id: participantId, name: participantName });
    setConfirmKickOpen(true);
  };

  const confirmKickParticipant = async () => {
    if (!targetParticipant) return;
    try {
      if (isPublicMeeting) {
        await kickPublicMeetingParticipantApi(meetingId, targetParticipant.id);
      } else {
        await kickParticipantApi(classroomId!, meetingId, targetParticipant.id);
      }
      if (socket?.connected) {
        socket.emit('admin:kick-user', { 
          targetUserId: targetParticipant.id, 
          reason: 'Kicked by host' 
        });
      }
      toast({
        title: "Participant Kicked",
        description: `${targetParticipant.name} has been removed from the meeting.`,
        variant: "default",
      });
      await fetchParticipants();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to kick participant",
        variant: "destructive",
      });
    }
    setConfirmKickOpen(false);
    setTargetParticipant(null);
  };

  const handleBlockParticipant = (participantId: string, participantName: string) => {
    setTargetParticipant({ id: participantId, name: participantName });
    setConfirmBlockOpen(true);
  };

  const confirmBlockParticipant = async () => {
    if (!targetParticipant) return;
    try {
      if (isPublicMeeting) {
        await blockPublicMeetingParticipantApi(meetingId, targetParticipant.id);
      }
      if (socket?.connected) {
        socket.emit('admin:block-user', { 
          targetUserId: targetParticipant.id, 
          reason: 'Blocked by host' 
        });
      }
      toast({
        title: "Participant Blocked",
        description: `${targetParticipant.name} has been blocked from the meeting.`,
        variant: "default",
      });
      await fetchParticipants();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block participant",
        variant: "destructive",
      });
    }
    setConfirmBlockOpen(false);
    setTargetParticipant(null);
  };

  const handleMuteParticipant = async (participantUserId: string) => {
    try {
      const participant = participants.find(p => {
        const pid = p.user?.id || (p.user as any)?.user_id;
        return pid === participantUserId;
      });
      if (!participant) return;

      if (isPublicMeeting) {
        await mutePublicMeetingParticipantApi(meetingId, participant.id);
      } else {
        await muteParticipantApi(classroomId!, meetingId, participant.id);
      }
      if (socket?.connected) {
        socket.emit('admin:mute-user', { 
          targetUserId: participantUserId, 
          mute: true 
        });
      }
      toast({ title: `Muted participant` });
      await fetchParticipants();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mute participant",
        variant: "destructive",
      });
    }
  };

  const handleVideoOffParticipant = async (participantUserId: string) => {
    try {
      const participant = participants.find(p => {
        const pid = p.user?.id || (p.user as any)?.user_id;
        return pid === participantUserId;
      });
      if (!participant) return;

      if (socket?.connected) {
        socket.emit('admin:video-off-user', { 
          targetUserId: participantUserId, 
          videoOff: true 
        });
      }
      toast({ title: `Turned off participant's camera` });
      await fetchParticipants();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to turn off camera",
        variant: "destructive",
      });
    }
  };

  // Host functions (placeholders)
  const handleAdmitParticipant = (userId: string) => { };
  const handleAdmitAllParticipants = () => { };
  const handleDenyParticipant = (userId: string) => { };
  const handleToggleWaitingRoom = () => setIsWaitingRoomEnabled(!isWaitingRoomEnabled);

  // Chat input handlers
  const handleChatInputSend = useCallback(async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !isOnline || isSending) return;

    try {
      setIsSending(true);
      await handleSendChatMessage(trimmedMessage);
      setNewMessage('');
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, isOnline, isSending, handleSendChatMessage]);

  const handleChatInputKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatInputSend();
    }
  }, [handleChatInputSend]);

  const handleEmojiClick = useCallback((emoji: string) => {
    setNewMessage(prev => prev + emoji);
    chatInputRef.current?.focus();
  }, []);

  // Get role icon
  const getRoleIcon = (role: ParticipantRole) => {
    if (role === ParticipantRole.HOST) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (role === ParticipantRole.MODERATOR) return <Shield className="w-4 h-4 text-blue-500" />;
    return null;
  };

  if (phase === 'green-room') {
    return (
      <GreenRoom
        meetingTitle={`Meeting ${meetingId}`}
        onJoinMeeting={handleJoin}
        onCancel={onLeave}
      />
    );
  }

  if (phase === 'waiting') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Waiting for Host</h2>
          <p>{waitingMessage || "The host will let you in shortly."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white relative flex">
      <ReactionComponent />

      {isHost && (
        <WaitingRoomHostPanel
          isHost={isHost}
          waitingParticipants={waitingParticipants}
          onAdmitParticipant={handleAdmitParticipant}
          onAdmitAllParticipants={handleAdmitAllParticipants}
          onDenyParticipant={handleDenyParticipant}
          onToggleWaitingRoom={handleToggleWaitingRoom}
          isWaitingRoomEnabled={isWaitingRoomEnabled}
          isVisible={showHostControls}
          onToggleVisibility={() => setShowHostControls(!showHostControls)}
        />
      )}

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gray-800 flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Meeting {meetingId}</h1>
            
            {/* LiveKit Bandwidth Monitor */}
            <LiveKitBandwidthMonitor
              meetingId={meetingId}
              userId={user.id}
              showDetailed={false}
              className="flex items-center"
              room={room}
            />

            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isSocketConnected && isLiveKitConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-400">
                {isSocketConnected && isLiveKitConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>

          {/* Header Tabs */}
          <div className="flex items-center">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${showParticipants ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              onClick={() => { setShowParticipants(true); setShowChat(false); setShowYouTubeSearch(false); }}
            >
              <Users className="w-4 h-4 mr-1 inline" />
              Participants
            </button>
            <div className="w-px h-4 bg-gray-600"></div>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${showChat ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              onClick={() => { setShowChat(true); setShowParticipants(false); setShowYouTubeSearch(false); }}
            >
              <MessageSquare className="w-4 h-4 mr-1 inline" />
              Chat
            </button>
            <div className="w-px h-4 bg-gray-600"></div>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${showYouTubeSearch ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              onClick={() => { setShowYouTubeSearch(!showYouTubeSearch); setShowParticipants(false); setShowChat(false); }}
            >
              <Play className="w-4 h-4 mr-1 inline" />
              Play
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video/YouTube Area */}
          <div className="flex-1 bg-gray-900 flex flex-col">
            {livekitError ? (
              <div className="flex-1 flex items-center justify-center">
                <Card className="p-6 text-center bg-gray-800 border-gray-700">
                  <p className="text-red-500 mb-4">Connection Error: {livekitError}</p>
                  <Button onClick={() => window.location.reload()}>Reload</Button>
                </Card>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4">
                {/* Video Grid */}
                <div className={showVideoGrid ? "h-full" : "hidden"}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {livekitParticipants.map((participant) => (
                      <ParticipantTile
                        key={participant.identity}
                        participant={participant}
                      />
                    ))}
                  </div>
                </div>

                {/* YouTube Player */}
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
            )}
          </div>

          {/* Sidebar */}
          {(showChat || showParticipants || showYouTubeSearch) && (
            <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0">
              {/* Participants Panel */}
              {showParticipants && (
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-2">
                    {participants.map((participant) => {
                      const participantUserId = participant.user?.id || (participant.user as any)?.user_id;
                      const isCurrentUser = participantUserId === user.id;
                      const canManageParticipant = isHost && !isCurrentUser && participant.role !== ParticipantRole.HOST;

                      return (
                        <div key={participant.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                          <div className="flex items-center gap-2 flex-1">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={(participant.user as any)?.avatar_url} />
                              <AvatarFallback>{(participant.user as any)?.name?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-1">
                                {getRoleIcon(participant.role)}
                                <span className="text-sm text-white">{(participant.user as any)?.name || 'Unknown'}</span>
                                {isCurrentUser && <span className="text-xs text-gray-400">(You)</span>}
                              </div>
                              <Badge variant={participant.is_online ? "default" : "secondary"} className="text-xs">
                                {participant.is_online ? "Online" : "Offline"}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Host actions */}
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
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="w-full justify-start text-orange-400 hover:text-orange-300 hover:bg-gray-700"
                                      onClick={() => handleMuteParticipant(participantUserId)}
                                    >
                                      <MicOff className="w-4 h-4 mr-2" />
                                      Mute mic
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="w-full justify-start text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                                      onClick={() => handleVideoOffParticipant(participantUserId)}
                                    >
                                      <VideoOff className="w-4 h-4 mr-2" />
                                      Turn off camera
                                    </Button>
                                    <div className="h-px bg-gray-600 my-1" />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="w-full justify-start text-yellow-400 hover:text-yellow-300 hover:bg-gray-700"
                                      onClick={() => handleKickParticipant(participantUserId, (participant.user as any)?.name || 'Unknown')}
                                    >
                                      <UserX className="w-4 h-4 mr-2" />
                                      Kick
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-gray-700"
                                      onClick={() => handleBlockParticipant(participantUserId, (participant.user as any)?.name || 'Unknown')}
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

              {/* Chat Panel */}
              {showChat && (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h3 className="font-semibold">Meeting Chat</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <MeetingChat
                      messages={chatMessages}
                      isOnline={isOnline}
                      currentUserId={user.id}
                      onSendMessage={handleSendChatMessage}
                      onSendReaction={handleSendReaction}
                    />
                  </div>
                </div>
              )}

              {/* YouTube Search Panel */}
              {showYouTubeSearch && (
                <div className="flex-1 flex flex-col overflow-hidden bg-[#0f0f0f]">
                  {/* Player Controls */}
                  {youtubeVideoId && (
                    <div className="p-4 border-b border-gray-800 bg-[#0f0f0f] flex-shrink-0">
                      <div className="flex flex-col gap-3">
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
                  
                  {/* YouTube Search Content */}
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
          )}
        </div>

        {/* Bottom Controls */}
        <div className="p-4 bg-gray-800">
          <MeetingControls
            isCameraEnabled={localParticipant ? Array.from(localParticipant.videoTrackPublications.values()).length > 0 : false}
            isMicEnabled={localParticipant ? Array.from(localParticipant.audioTrackPublications.values()).length > 0 : false}
            isScreenSharing={Array.from(localParticipant?.videoTrackPublications.values() || [])
              .some(pub => pub.source === 'screen_share')}
            onToggleCamera={handleToggleCamera}
            onToggleMicrophone={handleToggleMicrophone}
            onToggleScreenShare={handleToggleScreenShare}
            onLeave={handleLeave}
            bandwidth={bandwidth}
            disabled={!isLiveKitConnected}
          />
        </div>
      </div>

      {/* Leave Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave the meeting? You can rejoin at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
              Cancel
            </Button>
            <AlertDialogAction onClick={confirmLeave}>
              Leave Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kick Dialog */}
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

      {/* Block Dialog */}
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
    </div>
  );
}

/**
 * Individual participant video tile component
 */
function ParticipantTile({ participant }: { participant: LiveKitParticipant }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [hasVideo, setHasVideo] = React.useState(false);

  // Attach video track to video element
  useEffect(() => {
    const videoPublication = participant.tracks.video;
    if (videoRef.current && videoPublication?.track) {
      try {
        videoPublication.track.attach(videoRef.current);
        setHasVideo(true);
      } catch (error) {
        console.error(`Failed to attach video track for ${participant.identity}:`, error);
        setHasVideo(false);
      }

      return () => {
        if (videoPublication.track && videoRef.current) {
          try {
            videoPublication.track.detach(videoRef.current);
          } catch (error) {
            console.error(`Failed to detach video track for ${participant.identity}:`, error);
          }
        }
      };
    } else {
      setHasVideo(false);
    }
  }, [participant.tracks.video, participant.identity]);

  // Attach audio track to audio element
  useEffect(() => {
    const audioPublication = participant.tracks.audio;
    if (audioRef.current && audioPublication?.track) {
      try {
        audioPublication.track.attach(audioRef.current);
      } catch (error) {
        console.error(`Failed to attach audio track for ${participant.identity}:`, error);
      }

      return () => {
        if (audioPublication.track && audioRef.current) {
          try {
            audioPublication.track.detach(audioRef.current);
          } catch (error) {
            console.error(`Failed to detach audio track for ${participant.identity}:`, error);
          }
        }
      };
    }
  }, [participant.tracks.audio, participant.identity]);

  return (
    <Card className="relative overflow-hidden bg-gray-800 border-gray-700 aspect-video">
      <CardContent className="p-0 h-full flex items-center justify-center relative">
        {/* Video Element */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${hasVideo ? 'block' : 'hidden'}`}
          playsInline
          autoPlay
          muted={participant.isLocal}
        />

        {/* Audio Element (hidden) */}
        <audio ref={audioRef} autoPlay />

        {/* Placeholder if no video */}
        {!hasVideo && (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-white">
                {participant.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <span className="text-sm">{participant.name || 'Unknown'}</span>
          </div>
        )}

        {/* Participant Info Overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
          <div className="bg-black/50 px-2 py-1 rounded text-xs text-white flex items-center gap-2">
            <span>{participant.name || participant.identity} {participant.isLocal && '(You)'}</span>
            {participant.tracks.audio?.track?.isMuted ? (
              <MicOff className="w-3 h-3 text-red-400" />
            ) : (
              <div className={`w-2 h-2 rounded-full ${participant.isSpeaking ? 'bg-green-500' : 'bg-gray-400'}`} />
            )}
          </div>

          <Badge variant={participant.connectionQuality === 'excellent' ? 'default' : 'destructive'} className="text-[10px] h-5">
            {participant.connectionQuality}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
