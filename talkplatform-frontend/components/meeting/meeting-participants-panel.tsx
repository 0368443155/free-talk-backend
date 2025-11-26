"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Crown, Shield, UserX, VolumeX, MicOff, VideoOff, MonitorUp, Mic, Video } from "lucide-react";
import { IMeetingParticipant, ParticipantRole } from "@/api/meeting.rest";
import { Socket } from "socket.io-client";
import { useToast } from "@/components/ui/use-toast";

interface MeetingParticipantsPanelProps {
  participants: IMeetingParticipant[];
  currentUserId: string;
  isHost: boolean;
  socket: Socket | null;
  onKickParticipant: (participantId: string, participantName: string) => void;
  onBlockParticipant: (participantId: string, participantName: string) => void;
  onMuteParticipant?: (participantUserId: string) => void;
  onVideoOffParticipant?: (participantUserId: string) => void;
  onStopScreenShare?: (participantUserId: string) => void;
}

export function MeetingParticipantsPanel({
  participants,
  currentUserId,
  isHost,
  socket,
  onKickParticipant,
  onBlockParticipant,
  onMuteParticipant,
  onVideoOffParticipant,
  onStopScreenShare,
}: MeetingParticipantsPanelProps) {
  const { toast } = useToast();

  const getRoleIcon = (role: ParticipantRole) => {
    if (role === ParticipantRole.HOST) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (role === ParticipantRole.MODERATOR) return <Shield className="w-4 h-4 text-blue-500" />;
    return null;
  };

  const handleMute = (participantUserId: string, participantName: string, currentIsMuted: boolean) => {
    // Toggle: if currently muted, unmute; if not muted, mute
    const shouldMute = !currentIsMuted;

    if (socket?.connected) {
      socket.emit('admin:mute-user', {
        targetUserId: participantUserId,
        mute: shouldMute
      });
      toast({ title: shouldMute ? `Muted ${participantName}` : `Unmuted ${participantName}` });
    }
    onMuteParticipant?.(participantUserId);
  };

  const handleVideoOff = (participantUserId: string, participantName: string, currentIsVideoOff: boolean) => {
    // Toggle: if currently video off, turn on; if video on, turn off
    const shouldTurnOff = !currentIsVideoOff;

    if (socket?.connected) {
      socket.emit('admin:video-off-user', {
        targetUserId: participantUserId,
        videoOff: shouldTurnOff
      });
      toast({ title: shouldTurnOff ? `Turned off ${participantName}'s camera` : `Turned on ${participantName}'s camera` });
    }
    onVideoOffParticipant?.(participantUserId);
  };

  const handleStopShare = (participantUserId: string, participantName: string) => {
    if (socket?.connected) {
      socket.emit('admin:stop-share-user', {
        targetUserId: participantUserId
      });
      toast({ title: `Stopped ${participantName}'s screen share` });
    }
    onStopScreenShare?.(participantUserId);
  };

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-2">
        {participants.map((participant) => {
          const participantUserId = participant.user.id || participant.user.user_id;
          const isCurrentUser = participantUserId === currentUserId;
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
                        {/* Media controls */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full justify-start text-orange-400 hover:text-orange-300 hover:bg-gray-700"
                          onClick={() => handleMute(participantUserId, participant.user.name, participant.is_muted)}
                        >
                          {participant.is_muted ? (
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full justify-start text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                          onClick={() => handleVideoOff(participantUserId, participant.user.name, participant.is_video_off)}
                        >
                          {participant.is_video_off ? (
                            <>
                              <Video className="w-4 h-4 mr-2" />
                              Turn on camera
                            </>
                          ) : (
                            <>
                              <VideoOff className="w-4 h-4 mr-2" />
                              Turn off camera
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full justify-start text-purple-400 hover:text-purple-300 hover:bg-gray-700"
                          onClick={() => handleStopShare(participantUserId, participant.user.name)}
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
                          onClick={() => onKickParticipant(participantUserId, participant.user.name)}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Kick
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-gray-700"
                          onClick={() => onBlockParticipant(participantUserId, participant.user.name)}
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
  );
}

