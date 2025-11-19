"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  UserPlus,
  UserX,
  Clock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface WaitingParticipant {
  userId: string;
  username: string;
  email: string;
  waitingTime: number;
  isConnected: boolean;
}

interface WaitingRoomHostPanelProps {
  isHost: boolean;
  waitingParticipants: WaitingParticipant[];
  onAdmitParticipant: (participantId: string) => void;
  onAdmitAllParticipants: () => void;
  onDenyParticipant: (participantId: string, reason?: string) => void;
  onToggleWaitingRoom: (enabled: boolean) => void;
  isWaitingRoomEnabled: boolean;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

/**
 * UC-03: Waiting Room Host Management Panel
 * Allows hosts to manage participants waiting for meeting entry
 */
export function WaitingRoomHostPanel({
  isHost,
  waitingParticipants,
  onAdmitParticipant,
  onAdmitAllParticipants,
  onDenyParticipant,
  onToggleWaitingRoom,
  isWaitingRoomEnabled,
  isVisible,
  onToggleVisibility,
}: WaitingRoomHostPanelProps) {
  const [confirmAdmitAll, setConfirmAdmitAll] = useState(false);
  const [confirmDeny, setConfirmDeny] = useState<{ userId: string; username: string } | null>(null);
  const [denyReason, setDenyReason] = useState('');
  
  const { toast } = useToast();

  // Format waiting time
  const formatWaitingTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  // Handle admit participant
  const handleAdmitParticipant = (participant: WaitingParticipant) => {
    onAdmitParticipant(participant.userId);
    toast({
      title: "Participant Admitted",
      description: `${participant.username} has been admitted to the meeting.`,
    });
  };

  // Handle admit all participants
  const handleAdmitAllParticipants = () => {
    onAdmitAllParticipants();
    setConfirmAdmitAll(false);
    toast({
      title: "All Participants Admitted",
      description: `${waitingParticipants.length} participants have been admitted to the meeting.`,
    });
  };

  // Handle deny participant
  const handleDenyParticipant = (userId: string, reason?: string) => {
    onDenyParticipant(userId, reason);
    setConfirmDeny(null);
    setDenyReason('');
    
    const participant = waitingParticipants.find(p => p.userId === userId);
    toast({
      title: "Participant Denied",
      description: `${participant?.username || 'Participant'} has been removed from the waiting room.`,
      variant: "destructive",
    });
  };

  // Don't show panel if user is not host
  if (!isHost) {
    return null;
  }

  return (
    <>
      {/* Floating toggle button */}
      <Button
        onClick={onToggleVisibility}
        className={`fixed top-20 right-4 z-50 shadow-lg ${
          waitingParticipants.length > 0 ? 'animate-pulse' : ''
        }`}
        variant={waitingParticipants.length > 0 ? "default" : "outline"}
        size="sm"
      >
        {isVisible ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
        Waiting Room
        {waitingParticipants.length > 0 && (
          <Badge className="ml-2 bg-red-500 text-white">
            {waitingParticipants.length}
          </Badge>
        )}
      </Button>

      {/* Waiting room panel */}
      {isVisible && (
        <Card className="fixed top-32 right-4 w-80 max-h-96 z-40 shadow-lg border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Waiting Room
              </span>
              <div className="flex items-center gap-1">
                <Badge variant={isWaitingRoomEnabled ? "default" : "secondary"}>
                  {isWaitingRoomEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </CardTitle>
            
            {/* Waiting room controls */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToggleWaitingRoom(!isWaitingRoomEnabled)}
                className="flex-1 text-xs"
              >
                {isWaitingRoomEnabled ? "Disable" : "Enable"}
              </Button>
              
              {waitingParticipants.length > 1 && (
                <Button
                  size="sm"
                  onClick={() => setConfirmAdmitAll(true)}
                  className="flex-1 text-xs"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Admit All
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {waitingParticipants.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No one is waiting</p>
                <p className="text-xs">
                  {isWaitingRoomEnabled 
                    ? "Participants will appear here when they join"
                    : "Enable waiting room to control entry"
                  }
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {waitingParticipants.map((participant) => (
                    <div
                      key={participant.userId}
                      className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30"
                    >
                      {/* Participant avatar and info */}
                      <div className="flex items-center gap-2 flex-1">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {participant.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {participant.username}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{formatWaitingTime(participant.waitingTime)}</span>
                            {participant.isConnected ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdmitParticipant(participant)}
                          className="h-7 px-2"
                          title={`Admit ${participant.username}`}
                        >
                          <UserPlus className="w-3 h-3" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmDeny({
                            userId: participant.userId,
                            username: participant.username
                          })}
                          className="h-7 px-2 hover:bg-red-50 hover:border-red-200"
                          title={`Deny ${participant.username}`}
                        >
                          <UserX className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Quick stats */}
            {waitingParticipants.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="text-xs text-muted-foreground text-center">
                  {waitingParticipants.length} participant{waitingParticipants.length !== 1 ? 's' : ''} waiting
                  {waitingParticipants.filter(p => p.isConnected).length < waitingParticipants.length && (
                    <span className="ml-1 text-yellow-600">
                      • {waitingParticipants.filter(p => !p.isConnected).length} disconnected
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admit All Confirmation Dialog */}
      <AlertDialog open={confirmAdmitAll} onOpenChange={setConfirmAdmitAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Admit All Participants?</AlertDialogTitle>
            <AlertDialogDescription>
              This will admit all {waitingParticipants.length} participants currently in the waiting room. 
              They will be able to join the meeting immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdmitAllParticipants}>
              <UserPlus className="w-4 h-4 mr-2" />
              Admit All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deny Participant Confirmation Dialog */}
      <AlertDialog open={!!confirmDeny} onOpenChange={() => setConfirmDeny(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deny Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeny && (
                <>
                  This will remove <strong>{confirmDeny.username}</strong> from the waiting room 
                  and deny their request to join the meeting.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeny && handleDenyParticipant(confirmDeny.userId, denyReason)}
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Deny Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}