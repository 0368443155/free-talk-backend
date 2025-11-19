"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useLiveKit, LiveKitParticipant } from '@/hooks/use-livekit';
import { WaitingRoomHostPanel } from './waiting-room-host-panel';
import { GreenRoom, DeviceSettings } from './green-room';
import { MeetingControls } from './meeting-controls';
import { ReactionOverlay, useReactions } from './reaction-overlay';
import { MeetingChat } from '../../section/meetings/meeting-chat';
import { IMeetingChatMessage, MessageType } from '@/api/meeting.rest';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff, 
  Phone, 
  Settings,
  Users,
  MessageSquare,
  Hand,
  MoreVertical,
  X,
  Play,
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
 * Integrates Green Room, Waiting Room, and LiveKit video conferencing
 */
export function LiveKitRoomWrapper({ 
  meetingId, 
  user, 
  onLeave, 
  isHost = false 
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
  const [chatMessages, setChatMessages] = useState<IMeetingChatMessage[]>([]);
  const [bandwidth, setBandwidth] = useState({
    inbound: 0,
    outbound: 0,
    latency: 0,
    quality: 'good' as 'excellent' | 'good' | 'poor',
  });
  
  const { toast } = useToast();
  const { addReaction, ReactionOverlay: ReactionComponent } = useReactions();

  // LiveKit hook
  const {
    room,
    isConnected,
    isConnecting,
    error,
    localParticipant,
    participants,
    connectionQuality,
    enableCamera,
    enableMicrophone,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    sendReaction,
    disconnect,
    reconnect,
  } = useLiveKit({
    token: livekitToken,
    serverUrl: livekitWsUrl,
    onConnected: handleLiveKitConnected,
    onDisconnected: handleLiveKitDisconnected,
    onParticipantConnected: handleParticipantConnected,
    onParticipantDisconnected: handleParticipantDisconnected,
    onDataReceived: handleDataReceived,
  });

  // LiveKit event handlers
  function handleLiveKitConnected() {
    console.log('✅ Connected to LiveKit SFU');
    setPhase('meeting');
    
    // Apply device settings from Green Room
    if (deviceSettings) {
      enableCamera(deviceSettings.videoEnabled);
      enableMicrophone(deviceSettings.audioEnabled);
    }
    
    toast({
      title: "Connected to Meeting",
      description: "You are now connected via LiveKit SFU.",
    });
  }

  function handleLiveKitDisconnected() {
    console.log('❌ Disconnected from LiveKit');
    // Handle reconnection or return to green room
  }

  function handleParticipantConnected(participant: any) {
    console.log('👤 Participant connected:', participant.identity);
  }

  function handleParticipantDisconnected(participant: any) {
    console.log('👋 Participant disconnected:', participant.identity);
  }

  function handleDataReceived(payload: Uint8Array, participant?: any) {
    // Handle LiveKit data channel messages (chat, reactions)
    const decoder = new TextDecoder();
    const text = decoder.decode(payload);
    
    try {
      const data = JSON.parse(text);
      
      if (data.type === 'chat') {
        // Handle chat message from data channel
        console.log('💬 Chat via data channel:', data.message);
        
        // Add to local chat messages
        const chatMessage: IMeetingChatMessage = {
          id: `${Date.now()}-${Math.random()}`,
          message: data.message,
          type: MessageType.TEXT,
          created_at: new Date(data.timestamp || Date.now()),
          sender: {
            user_id: participant?.identity || 'unknown',
            name: participant?.name || 'Unknown User',
            avatar_url: '',
          } as any,
          meeting: null as any,
        };
        
        setChatMessages(prev => [...prev, chatMessage]);
        
      } else if (data.type === 'reaction') {
        // Handle reaction
        console.log('👍 Reaction via data channel:', data.emoji);
        
        // Show flying emoji
        const senderName = participant?.name || participant?.identity || 'Someone';
        addReaction(data.emoji, senderName);
      }
    } catch (error) {
      console.error('Failed to parse data channel message:', error);
    }
  }

  // Fetch LiveKit token from backend
  const fetchLiveKitToken = async (participantRole: 'host' | 'participant' | 'waiting' = 'participant') => {
    try {
      const response = await fetch('/api/v1/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          meetingId,
          participantRole,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get LiveKit token');
      }

      const data = await response.json();
      
      if (data.waitingRoom) {
        setPhase('waiting');
        setWaitingMessage(data.message);
      }
      
      setLivekitToken(data.token);
      setLivekitWsUrl(data.wsUrl);
      
      return data;

    } catch (error) {
      console.error('Failed to fetch LiveKit token:', error);
      toast({
        title: "Connection Failed",
        description: "Unable to connect to meeting server. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Green Room handlers
  const handleJoinFromGreenRoom = useCallback(async (settings: DeviceSettings) => {
    setDeviceSettings(settings);
    
    try {
      await fetchLiveKitToken(isHost ? 'host' : 'participant');
    } catch (error) {
      // Stay in green room on error
      setPhase('green-room');
    }
  }, [meetingId, isHost]);

  const handleCancelFromGreenRoom = () => {
    onLeave();
  };

  // Waiting Room (Host) handlers
  const handleAdmitParticipant = useCallback(async (participantId: string) => {
    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/waiting-room/admit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ participantId }),
      });

      if (!response.ok) {
        throw new Error('Failed to admit participant');
      }

      // Remove from local state
      setWaitingParticipants(prev => prev.filter(p => p.userId !== participantId));

    } catch (error) {
      console.error('Failed to admit participant:', error);
      toast({
        title: "Failed to Admit",
        description: "Unable to admit participant. Please try again.",
        variant: "destructive",
      });
    }
  }, [meetingId]);

  const handleAdmitAllParticipants = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/waiting-room/admit-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to admit all participants');
      }

      // Clear waiting participants
      setWaitingParticipants([]);

    } catch (error) {
      console.error('Failed to admit all participants:', error);
      toast({
        title: "Failed to Admit All",
        description: "Unable to admit all participants. Please try again.",
        variant: "destructive",
      });
    }
  }, [meetingId]);

  const handleDenyParticipant = useCallback(async (participantId: string, reason?: string) => {
    try {
      const response = await fetch(`/api/v1/meetings/${meetingId}/waiting-room/deny`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ participantId, reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to deny participant');
      }

      // Remove from local state
      setWaitingParticipants(prev => prev.filter(p => p.userId !== participantId));

    } catch (error) {
      console.error('Failed to deny participant:', error);
      toast({
        title: "Failed to Deny",
        description: "Unable to deny participant. Please try again.",
        variant: "destructive",
      });
    }
  }, [meetingId]);

  const handleToggleWaitingRoom = useCallback(async (enabled: boolean) => {
    // TODO: Implement waiting room toggle API
    setIsWaitingRoomEnabled(enabled);
    toast({
      title: enabled ? "Waiting Room Enabled" : "Waiting Room Disabled",
      description: enabled 
        ? "New participants will wait for your approval."
        : "New participants can join directly.",
    });
  }, []);

  // Meeting control handlers
  const handleToggleCamera = () => {
    if (localParticipant) {
      const currentVideoEnabled = Array.from(localParticipant.videoTrackPublications.values())
        .some(pub => pub.track?.enabled);
      enableCamera(!currentVideoEnabled);
    }
  };

  const handleToggleMicrophone = () => {
    if (localParticipant) {
      const currentAudioEnabled = Array.from(localParticipant.audioTrackPublications.values())
        .some(pub => pub.track?.enabled);
      enableMicrophone(!currentAudioEnabled);
    }
  };

  const handleToggleScreenShare = () => {
    const isCurrentlySharing = Array.from(localParticipant?.videoTrackPublications.values() || [])
      .some(pub => pub.source === 'screen_share');
    
    if (isCurrentlySharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  // Chat message handler
  const handleSendChatMessage = useCallback(async (message: string) => {
    if (!room || !localParticipant) return;
    
    try {
      // Send via LiveKit data channel
      await sendChatMessage(message);
      
      // Add to local messages immediately for optimistic UI
      const chatMessage: IMeetingChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        type: MessageType.TEXT,
        created_at: new Date(),
        sender: {
          user_id: user.id,
          name: user.username,
          avatar_url: '',
        } as any,
        meeting: null as any,
      };
      
      setChatMessages(prev => [...prev, chatMessage]);
      
    } catch (error) {
      console.error('Failed to send chat message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }, [room, localParticipant, sendChatMessage, user, toast]);

  // Reaction handler
  const handleSendReaction = useCallback(async (emoji: string) => {
    if (!room || !localParticipant) return;
    
    try {
      // Send via LiveKit data channel
      await sendReaction(emoji);
      
      // Show locally immediately
      addReaction(emoji, user.username);
      
    } catch (error) {
      console.error('Failed to send reaction:', error);
      toast({
        title: "Failed to send reaction",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }, [room, localParticipant, sendReaction, addReaction, user.username, toast]);

  // Update bandwidth monitoring
  useEffect(() => {
    if (!room) return;
    
    const updateBandwidth = () => {
      // Simulate bandwidth monitoring - in real app, get from LiveKit stats
      setBandwidth(prev => ({
        inbound: Math.random() * 500 + 200, // 200-700 KB/s
        outbound: Math.random() * 300 + 100, // 100-400 KB/s
        latency: Math.random() * 50 + 20, // 20-70 ms
        quality: connectionQuality === 'excellent' ? 'excellent' : 
                connectionQuality === 'poor' ? 'poor' : 'good',
      }));
    };
    
    const interval = setInterval(updateBandwidth, 2000);
    return () => clearInterval(interval);
  }, [room, connectionQuality]);

  const handleLeave = () => {
    setShowLeaveDialog(true);
  };

  const confirmLeave = () => {
    disconnect();
    onLeave();
  };

  // Render different phases
  if (phase === 'green-room') {
    return (
      <GreenRoom
        onJoinMeeting={handleJoinFromGreenRoom}
        onCancel={handleCancelFromGreenRoom}
        meetingTitle={`Meeting ${meetingId}`}
        isWaitingRoom={false}
      />
    );
  }

  if (phase === 'waiting') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Waiting Room
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Please Wait</h3>
            <p className="text-muted-foreground">
              {waitingMessage || 'The host will admit you to the meeting shortly.'}
            </p>
          </div>
          <Button variant="outline" onClick={onLeave}>
            Leave Waiting Room
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Main meeting interface
  return (
    <div className="h-screen bg-gray-900 text-white relative flex">
      {/* Reaction Overlay */}
      <ReactionComponent />
      
      {/* Host Controls Panel */}
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

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header with meeting info */}
        <div className="p-4 bg-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Meeting {meetingId}</h1>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge variant="outline">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </Badge>
            {connectionQuality !== 'unknown' && (
              <Badge variant="outline">
                Quality: {connectionQuality}
              </Badge>
            )}
          </div>
        </div>

        {/* Main content area with video grid and sidebar */}
        <div className="flex-1 flex relative">
          {/* Video grid area */}
          <div className="flex-1 p-4 relative">
            {/* Control buttons positioned above sidebars */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <Button
                variant={showParticipants ? "default" : "outline"}
                size="sm"
                onClick={() => setShowParticipants(!showParticipants)}
                className="rounded-lg px-3 bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700/90"
              >
                <Users className="w-4 h-4 mr-1" />
                Participants
              </Button>

              <Button
                variant={showChat ? "default" : "outline"}
                size="sm"
                onClick={() => setShowChat(!showChat)}
                className="rounded-lg px-3 bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700/90"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Chat
              </Button>

              <Button
                variant={showPlayControls ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPlayControls(!showPlayControls)}
                className="rounded-lg px-3 bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700/90"
              >
                <Play className="w-4 h-4 mr-1" />
                Play
              </Button>
            </div>
            {error ? (
              <Card className="p-6 text-center">
                <p className="text-red-500 mb-4">Connection Error: {error}</p>
                <Button onClick={reconnect}>Reconnect</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
                {participants.map((participant) => (
                  <ParticipantTile 
                    key={participant.identity} 
                    participant={participant}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Chat sidebar */}
          {showChat && (
            <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="font-semibold">Meeting Chat</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1">
                <MeetingChat
                  messages={chatMessages}
                  isOnline={isConnected}
                  currentUserId={user.id}
                  onSendMessage={handleSendChatMessage}
                  onSendReaction={handleSendReaction}
                />
              </div>
            </div>
          )}

          {/* Participants sidebar */}
          {showParticipants && (
            <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="font-semibold">Participants ({participants.length})</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowParticipants(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 p-4 space-y-2">
                {participants.map((participant) => (
                  <div key={participant.identity} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold">
                        {participant.name?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{participant.name || participant.identity}</p>
                      {participant.isLocal && <p className="text-xs text-gray-400">You</p>}
                    </div>
                    {participant.isSpeaking && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom controls with new layout */}
        <div className="p-4 bg-gray-800">
          <MeetingControls
            isCameraEnabled={localParticipant ? Array.from(localParticipant.videoTrackPublications.values())
              .some(pub => pub.track?.enabled) : false}
            isMicEnabled={localParticipant ? Array.from(localParticipant.audioTrackPublications.values())
              .some(pub => pub.track?.enabled) : false}
            isScreenSharing={Array.from(localParticipant?.videoTrackPublications.values() || [])
              .some(pub => pub.source === 'screen_share')}
            onToggleCamera={handleToggleCamera}
            onToggleMicrophone={handleToggleMicrophone}
            onToggleScreenShare={handleToggleScreenShare}
            onLeave={handleLeave}
            bandwidth={bandwidth}
            disabled={!isConnected}
          />
        </div>
      </div>

      {/* Leave confirmation dialog */}
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
    </div>
  );
}

/**
 * Individual participant video tile component
 */
function ParticipantTile({ participant }: { participant: LiveKitParticipant }) {
  return (
    <Card className="bg-gray-800 border-gray-700 relative overflow-hidden aspect-video">
      <CardContent className="p-0 h-full">
        {/* Video element would be rendered here based on LiveKit track */}
        <div className="h-full bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-xl font-semibold">
                {participant.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <p className="text-sm">{participant.name || participant.identity}</p>
            {participant.isSpeaking && (
              <Badge className="mt-1" size="sm">Speaking</Badge>
            )}
          </div>
        </div>
        
        {/* Participant status indicators */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {!participant.tracks.audio && (
            <div className="bg-red-500 rounded-full p-1">
              <MicOff className="w-3 h-3" />
            </div>
          )}
          {!participant.tracks.video && (
            <div className="bg-red-500 rounded-full p-1">
              <VideoOff className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Host indicator */}
        {participant.metadata && JSON.parse(participant.metadata)?.role === 'host' && (
          <Badge className="absolute top-2 left-2" size="sm">
            Host
          </Badge>
        )}

        {/* Connection quality */}
        <div className="absolute top-2 right-2">
          <Badge variant="outline" size="sm">
            {participant.connectionQuality}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}