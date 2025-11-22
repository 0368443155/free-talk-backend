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
import { MeetingDialogs } from './meeting-dialogs';
import { useMeetingYouTube } from '@/hooks/use-meeting-youtube';
import { useMeetingChat } from '@/hooks/use-meeting-chat';
import { useMeetingParticipants } from '@/hooks/use-meeting-participants';
import { 
  IMeetingChatMessage, 
  MessageType, 
  IMeetingParticipant, 
  ParticipantRole, 
  joinMeetingApi, 
  joinPublicMeetingApi, 
  leaveMeetingApi, 
  leavePublicMeetingApi, 
  lockMeetingApi,
  unlockMeetingApi,
  lockPublicMeetingApi,
  unlockPublicMeetingApi
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
  MonitorOff,
  PhoneOff,
  Video,
  Mic,
  ChevronLeft,
  ChevronRight,
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
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [chatMessages, setChatMessages] = useState<IMeetingChatMessage[]>([]);
  const [participantsRefreshKey, setParticipantsRefreshKey] = useState(0); // Force re-render key
  const [bandwidth, setBandwidth] = useState({
    inbound: 0,
    outbound: 0,
    latency: 0,
    quality: 'good' as 'excellent' | 'good' | 'poor',
  });

  // YouTube Player state
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false);
  const [youtubeVolume, setYoutubeVolume] = useState(50);
  const youtubePlayerRef = useRef<YouTubePlayerHandle | null>(null);

  // Dialog states
  const [confirmKickOpen, setConfirmKickOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [targetParticipant, setTargetParticipant] = useState<{ id: string; name: string } | null>(null);

  // Chat input state (for MeetingChatPanel)
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  // Local state
  const [isJoining, setIsJoining] = useState(false);

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
    meetingId,
    isPublicMeeting,
    classroomId,
  });

  // Use shared chat hook
  const {
    chatMessages,
    setChatMessages,
    handleSendMessage: handleSendChatMessage,
    fetchChatMessages,
  } = useMeetingChat({
    socket,
    meetingId,
    isPublicMeeting,
    classroomId,
    isOnline,
  });

  // Use shared YouTube hook
  const {
    youtubeVideoId,
    youtubeIsPlaying,
    youtubeCurrentTime,
    setYoutubeVideoId,
    setYoutubeIsPlaying,
    setYoutubeCurrentTime,
  } = useMeetingYouTube({
    socket,
  });

  // Local state
  const [isJoining, setIsJoining] = useState(false);

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
          // Skip LiveKit data channel chat messages - we only use Socket.IO for chat
          // This prevents duplicate messages
          return;
        } else if (data.type === 'reaction') {
          addReaction(data.emoji, user.id);
        }
      } catch (e) {
        console.error('Failed to parse received data:', e);
      }
    }
  });

  // fetchParticipants and fetchChatMessages are now provided by hooks

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

  // YouTube and Chat handlers are now in shared hooks - no need for duplicate code

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
      // If it's the current user being muted, enforce it
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
      
      // If host, refresh participants to update UI
      if (isHost) {
        console.log('🔄 Host: Participant mute state changed, refreshing UI', data);
        fetchParticipants();
        setParticipantsRefreshKey(prev => prev + 1); // Force re-render
      }
    };

    const handleForceVideoOff = (data: { userId: string; isVideoOff: boolean }) => {
      // If it's the current user being video off, enforce it
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
      
      // If host, refresh participants to update UI
      if (isHost) {
        console.log('🔄 Host: Participant video state changed, refreshing UI', data);
        fetchParticipants();
        setParticipantsRefreshKey(prev => prev + 1); // Force re-render
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
  }, [socket, user.id, localParticipant, enableMicrophone, enableCamera, stopScreenShare, disconnect, onLeave, toast, isHost, fetchParticipants]);

  // Bandwidth monitoring
  useEffect(() => {
    if (!room || !isLiveKitConnected) return;

    // Bandwidth is now updated via LiveKitBandwidthMonitor callback
    // No need for mock data interval
  }, [room, isLiveKitConnected]);

  const handleJoin = async (settings: DeviceSettings) => {
    setDeviceSettings(settings);
    try {
      console.log('🔐 Requesting LiveKit token for meeting:', meetingId);
      const data = await generateLiveKitTokenApi(meetingId);
      
      if (!data || !data.token || !data.wsUrl) {
        throw new Error('Invalid token response from server');
      }
      
      console.log('✅ LiveKit token received successfully');
      setLivekitToken(data.token);
      setLivekitWsUrl(data.wsUrl);
      setPhase('meeting');
    } catch (error: any) {
      console.error("❌ Failed to get LiveKit token:", error);
      
      // Extract error message
      let errorMessage = "Failed to join meeting. Could not generate token.";
      if (error.response) {
        // Server responded with error
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400) {
          errorMessage = data?.message || "Invalid request. Please check your meeting ID.";
        } else if (status === 401) {
          errorMessage = "Authentication failed. Please log in again.";
          // Clear tokens and redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setTimeout(() => window.location.href = '/login', 2000);
          }
        } else if (status === 403) {
          errorMessage = data?.message || "Access denied. You may not have permission to join this meeting.";
        } else if (status === 404) {
          errorMessage = "Meeting not found. Please check the meeting ID.";
        } else {
          errorMessage = data?.message || `Server error (${status}). Please try again later.`;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = "Network error. Please check your internet connection.";
      } else {
        // Something else happened
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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

  // handleSendChatMessage is now provided by useMeetingChat hook

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

  // Toggle video grid / YouTube player
  const handleToggleVideoGrid = () => {
    setShowVideoGrid(prev => !prev);
  };

  // Toggle lock room (host only)
  const handleToggleLockRoom = async () => {
    if (!isHost) return;
    try {
      if (isRoomLocked) {
        if (isPublicMeeting) {
          await unlockPublicMeetingApi(meetingId);
        } else {
          await unlockMeetingApi(classroomId!, meetingId);
        }
        setIsRoomLocked(false);
        toast({ title: "Success", description: "Meeting unlocked" });
      } else {
        if (isPublicMeeting) {
          await lockPublicMeetingApi(meetingId);
        } else {
          await lockMeetingApi(classroomId!, meetingId);
        }
        setIsRoomLocked(true);
        toast({ title: "Success", description: "Meeting locked" });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to toggle lock",
        variant: "destructive",
      });
    }
  };

  // Refresh page
  const handleRefresh = () => {
    window.location.reload();
  };

  // Host participant management
  // UI handlers for opening dialogs
  const handleKickParticipant = (participantId: string, participantName: string) => {
    setTargetParticipant({ id: participantId, name: participantName });
    setConfirmKickOpen(true);
  };

  const confirmKickParticipant = async () => {
    if (!targetParticipant) return;
    // Emit socket event for real-time notification
    if (socket?.connected) {
      socket.emit('admin:kick-user', { 
        targetUserId: targetParticipant.id, 
        reason: 'Kicked by host' 
      });
    }
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
    if (socket?.connected) {
      socket.emit('admin:block-user', { 
        targetUserId: targetParticipant.id, 
        reason: 'Blocked by host' 
      });
    }
    // Call API to actually block
    await handleBlockParticipantApi(targetParticipant.id, targetParticipant.name);
    setConfirmBlockOpen(false);
    setTargetParticipant(null);
  };

  const handleMuteParticipant = async (participantUserId: string) => {
    try {
      // Find LiveKit participant - identity format is "user-{userId}"
      const livekitParticipant = livekitParticipants.find(p => {
        // Match identity like "user-123" with userId "123"
        const identityUserId = p.identity?.replace('user-', '');
        return identityUserId === participantUserId || p.identity === `user-${participantUserId}` || p.identity === participantUserId;
      });
      
      // Get current mute state from LiveKit
      const isCurrentlyMuted = livekitParticipant?.tracks.audio?.track?.isMuted ?? false;
      const shouldMute = !isCurrentlyMuted; // Toggle: if not muted, mute it; if muted, unmute it

      const participant = participants.find(p => {
        const pid = p.user?.id || (p.user as any)?.user_id;
        return pid === participantUserId;
      });
      if (!participant) return;

      // Emit socket event for real-time notification
      if (socket?.connected) {
        socket.emit('admin:mute-user', { 
          targetUserId: participantUserId, 
          mute: shouldMute 
        });
      }
      // Use shared hook function
      await handleMuteParticipantApi(participant.id, participantUserId);
      toast({ 
        title: shouldMute ? `Muted participant` : `Unmuted participant`
      });
      
      // Force refresh participants and wait a bit for LiveKit to update
      await fetchParticipants();
      
      // Force LiveKit to refresh participants by triggering a re-render
      // The useLiveKit hook should automatically update when tracks change
      setTimeout(() => {
        if (room) {
          // Force update by accessing room state
          console.log('🔄 Forcing LiveKit participants refresh after mute action');
        }
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle mute",
        variant: "destructive",
      });
    }
  };

  const handleVideoOffParticipant = async (participantUserId: string) => {
    try {
      // Find LiveKit participant - identity format is "user-{userId}"
      const livekitParticipant = livekitParticipants.find(p => {
        // Match identity like "user-123" with userId "123"
        const identityUserId = p.identity?.replace('user-', '');
        return identityUserId === participantUserId || p.identity === `user-${participantUserId}` || p.identity === participantUserId;
      });
      
      // Get current video state from LiveKit (has video track = enabled)
      const isVideoEnabled = !!livekitParticipant?.tracks.video?.track;
      const shouldTurnOff = isVideoEnabled; // Toggle: if enabled, turn off; if disabled, turn on

      const participant = participants.find(p => {
        const pid = p.user?.id || (p.user as any)?.user_id;
        return pid === participantUserId;
      });
      if (!participant) return;

      if (socket?.connected) {
        socket.emit('admin:video-off-user', { 
          targetUserId: participantUserId, 
          videoOff: shouldTurnOff 
        });
      }
      toast({ 
        title: shouldTurnOff ? `Turned off participant's camera` : `Turned on participant's camera`
      });
      
      // Force refresh participants from database
      await fetchParticipants();
      
      // Force LiveKit to refresh by manually triggering transformParticipants
      if (room) {
        // The useLiveKit hook will automatically update via TrackPublished/TrackUnpublished events
        console.log('🔄 Video action completed, waiting for LiveKit to update tracks...');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle camera",
        variant: "destructive",
      });
    }
  };

  const handleStopScreenShareParticipant = async (participantUserId: string) => {
    try {
      if (socket?.connected) {
        socket.emit('admin:stop-screen-share', { 
          targetUserId: participantUserId
        });
      }
      toast({ title: `Stopped participant's screen share` });
      await fetchParticipants();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop screen share",
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
        {/* Header - Like image 1 */}
        <div className="px-4 py-2 bg-gray-800 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">Meeting {meetingId}</h1>
            
            {/* LiveKit Connection Status - Rounded rectangle like image 1 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-lg border border-gray-600">
              <span className="text-xs text-gray-300">LiveKit Connection</span>
              <div className={`w-2 h-2 rounded-full ${isSocketConnected && isLiveKitConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs font-medium text-white">
                Status: {isSocketConnected && isLiveKitConnected ? 'connected' : 'connecting'}
              </span>
            </div>
          </div>

          {/* Header Tabs */}
          <div className="flex items-center">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${showParticipants ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              onClick={() => { 
                setShowParticipants(true); 
                setShowChat(false); 
                setShowYouTubeSearch(false);
                // Auto-open sidebar if collapsed
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
              }}
            >
              <Users className="w-4 h-4 mr-1 inline" />
              Participants
            </button>
            <div className="w-px h-4 bg-gray-600"></div>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${showChat ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              onClick={() => { 
                setShowChat(true); 
                setShowParticipants(false); 
                setShowYouTubeSearch(false);
                // Auto-open sidebar if collapsed
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
              }}
            >
              <MessageSquare className="w-4 h-4 mr-1 inline" />
              Chat
            </button>
            <div className="w-px h-4 bg-gray-600"></div>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${showYouTubeSearch ? 'text-white bg-gray-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
              onClick={() => { 
                setShowYouTubeSearch(!showYouTubeSearch); 
                setShowParticipants(false); 
                setShowChat(false);
                // Auto-open sidebar if collapsed
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
              }}
            >
              <Play className="w-4 h-4 mr-1 inline" />
              Play
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
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
              <div className="flex-1 overflow-hidden">
                {/* Video Grid */}
                <div className={showVideoGrid ? "h-full flex" : "hidden"}>
                  {(() => {
                    // Find screen share participant - check tracks.screen (separate from camera video)
                    // Check both local and remote participants for screen share
                    const screenShareParticipant = livekitParticipants.find(p => {
                      const screenTrack = p.tracks.screen;
                      const hasScreenTrack = screenTrack && screenTrack.track;
                      if (hasScreenTrack) {
                        console.log(`🖥️ Found screen share from ${p.identity}, track subscribed: ${screenTrack.isSubscribed}`);
                      }
                      return hasScreenTrack && screenTrack.isSubscribed;
                    });
                    const hasScreenShare = !!screenShareParticipant;
                    // Regular participants are all participants (screen share is shown separately)
                    const regularParticipants = livekitParticipants;

                    if (hasScreenShare) {
                      // Layout with screen share: Screen share left, participants right of screen share
                      // Exclude the screen share participant from regular participants list
                      const participantsWithoutScreenShare = regularParticipants.filter(
                        p => p.identity !== screenShareParticipant.identity
                      );
                      
                      return (
                        <div className="flex-1 flex h-full gap-2 p-2">
                          {/* Screen Share - Full size on left */}
                          <div className={`flex-1 min-w-0 transition-all duration-300`}>
                            <div className="h-full w-full">
                              <ParticipantTile
                                key={`screen-${screenShareParticipant.identity}`}
                                participant={screenShareParticipant}
                                isScreenShare={true}
                              />
                            </div>
                          </div>

                          {/* Participants Grid - Vertical on right of screen share */}
                          {participantsWithoutScreenShare.length > 0 && (
                            <div className={`flex-shrink-0 flex flex-col gap-2 overflow-y-auto transition-all duration-300 ${
                              isSidebarCollapsed 
                                ? 'w-80' // Expand when sidebar is collapsed
                                : 'w-64' // Normal width when sidebar is open
                            }`}>
                              {participantsWithoutScreenShare.map((participant) => (
                                <div key={participant.identity} className="flex-shrink-0">
                                  <ParticipantTile
                                    participant={participant}
                                    isCompact={true}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // Normal grid layout when no screen share
                      return (
                        <div className="h-full overflow-auto p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {regularParticipants.map((participant) => (
                              <ParticipantTile
                                key={participant.identity}
                                participant={participant}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    }
                  })()}
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
            <>
              {/* Sidebar Toggle Button - Positioned between content and sidebar */}
              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-gray-700 hover:bg-gray-600 border border-gray-600 shadow-lg ${
                  isSidebarCollapsed 
                    ? 'right-2' 
                    : 'right-[320px]' // 80 * 4 = 320px (w-80)
                } transition-all duration-300`}
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              >
                {isSidebarCollapsed ? (
                  <ChevronLeft className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </Button>

              <div className={`bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0 transition-all duration-300 ${
                isSidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
              } h-full`}>
              {/* Participants Panel */}
              {showParticipants && (
                <ScrollArea className="flex-1 p-4 min-h-0">
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
                          {canManageParticipant && participant.is_online && (() => {
                            // Get LiveKit participant for real-time state - identity format is "user-{userId}"
                            const livekitParticipant = livekitParticipants.find(p => {
                              // Match identity like "user-123" with userId "123"
                              const identityUserId = p.identity?.replace('user-', '');
                              return identityUserId === participantUserId || p.identity === `user-${participantUserId}` || p.identity === participantUserId;
                            });
                            
                            // Get real-time states from LiveKit
                            const isMicMuted = livekitParticipant?.tracks.audio?.track?.isMuted ?? false;
                            const isVideoEnabled = !!livekitParticipant?.tracks.video?.track;
                            const isScreenSharing = !!livekitParticipant?.tracks.screen?.track;
                            
                            // Also check database state as fallback (for when LiveKit hasn't updated yet)
                            // Database state from participant object
                            const dbIsMuted = (participant as any).is_muted ?? false;
                            const dbIsVideoOff = (participant as any).is_video_off ?? false;
                            
                            // Use LiveKit state if available, otherwise fallback to database state
                            const finalIsMicMuted = livekitParticipant ? isMicMuted : dbIsMuted;
                            const finalIsVideoEnabled = livekitParticipant ? isVideoEnabled : !dbIsVideoOff;
                            
                            console.log('🔍 Participant state check:', {
                              participantUserId,
                              livekitIdentity: livekitParticipant?.identity,
                              isMicMuted: finalIsMicMuted,
                              isVideoEnabled: finalIsVideoEnabled,
                              isScreenSharing,
                              dbIsMuted,
                              dbIsVideoOff,
                              refreshKey: participantsRefreshKey
                            });

                            return (
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
                                      {/* Toggle Mic - shows opposite action */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start text-orange-400 hover:text-orange-300 hover:bg-gray-700"
                                        onClick={() => handleMuteParticipant(participantUserId)}
                                      >
                                        {finalIsMicMuted ? (
                                          <>
                                            <Mic className="w-4 h-4 mr-2" />
                                            Unmute mic
                                          </>
                                        ) : (
                                          <>
                                            <MicOff className="w-4 h-4 mr-2" />
                                            Mute mic
                                          </>
                                        )}
                                      </Button>
                                      
                                      {/* Toggle Camera - shows opposite action */}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                                        onClick={() => handleVideoOffParticipant(participantUserId)}
                                      >
                                        {finalIsVideoEnabled ? (
                                          <>
                                            <VideoOff className="w-4 h-4 mr-2" />
                                            Turn off camera
                                          </>
                                        ) : (
                                          <>
                                            <Video className="w-4 h-4 mr-2" />
                                            Turn on camera
                                          </>
                                        )}
                                      </Button>
                                      
                                      {/* Stop Screen Share - only show if sharing */}
                                      {isScreenSharing && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="w-full justify-start text-purple-400 hover:text-purple-300 hover:bg-gray-700"
                                          onClick={() => handleStopScreenShareParticipant(participantUserId)}
                                        >
                                          <MonitorOff className="w-4 h-4 mr-2" />
                                          Stop screen share
                                        </Button>
                                      )}
                                      
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
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {/* Chat Panel */}
              {showChat && (
                <div className="flex-1 flex flex-col h-full min-h-0 relative z-10">
                  <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <h3 className="font-semibold">Meeting Chat</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden relative">
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
            </>
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
            onToggleVideoGrid={handleToggleVideoGrid}
            showVideoGrid={showVideoGrid}
            onToggleLockRoom={handleToggleLockRoom}
            isRoomLocked={isRoomLocked}
            isHost={isHost}
            onRefresh={handleRefresh}
            bandwidth={bandwidth}
            disabled={!isLiveKitConnected}
          />
        </div>
      </div>

      {/* Shared Dialogs Component */}
      <MeetingDialogs
        confirmLeaveOpen={showLeaveDialog}
        setConfirmLeaveOpen={setShowLeaveDialog}
        onConfirmLeave={confirmLeave}
        confirmKickOpen={confirmKickOpen}
        setConfirmKickOpen={setConfirmKickOpen}
        targetParticipant={targetParticipant}
        onConfirmKick={confirmKickParticipant}
        setTargetParticipant={setTargetParticipant}
        confirmBlockOpen={confirmBlockOpen}
        setConfirmBlockOpen={setConfirmBlockOpen}
        onConfirmBlock={confirmBlockParticipant}
        showRoomFullDialog={false}
        setShowRoomFullDialog={() => {}}
        onlineParticipantsCount={participants.filter(p => p.is_online).length}
        maxParticipants={100}
        isPublicMeeting={isPublicMeeting}
        blockedModalOpen={false}
        blockedMessage=""
        setBlockedModalOpen={() => {}}
      />
    </div>
  );
}

/**
 * Individual participant video tile component
 */
function ParticipantTile({ participant, isScreenShare = false, isCompact = false }: { participant: LiveKitParticipant; isScreenShare?: boolean; isCompact?: boolean }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [hasVideo, setHasVideo] = React.useState(false);

  // Determine which track to use: screen share track or camera video track
  const trackPublication = isScreenShare 
    ? participant.tracks.screen  // Use screen share track when isScreenShare=true
    : participant.tracks.video;  // Use camera video track otherwise

  // Attach video track to video element
  useEffect(() => {
    if (videoRef.current && trackPublication?.track) {
      try {
        trackPublication.track.attach(videoRef.current);
        setHasVideo(true);
        console.log(`✅ Attached ${isScreenShare ? 'screen share' : 'video'} track for ${participant.identity}`);
      } catch (error) {
        console.error(`Failed to attach ${isScreenShare ? 'screen share' : 'video'} track for ${participant.identity}:`, error);
        setHasVideo(false);
      }

      return () => {
        if (trackPublication.track && videoRef.current) {
          try {
            trackPublication.track.detach(videoRef.current);
          } catch (error) {
            console.error(`Failed to detach ${isScreenShare ? 'screen share' : 'video'} track for ${participant.identity}:`, error);
          }
        }
      };
    } else {
      setHasVideo(false);
      if (isScreenShare) {
        console.log(`⚠️ No screen share track available for ${participant.identity}`);
      }
    }
  }, [trackPublication, participant.identity, isScreenShare]);

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
    <Card className={`relative overflow-hidden bg-gray-800 border-gray-700 ${
      isScreenShare ? 'h-full w-full' : isCompact ? 'aspect-video w-full' : 'aspect-video'
    }`}>
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
