"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Users, Zap, Shield, Loader2 } from "lucide-react";
import { IMeeting } from "@/api/meeting.rest";

interface MeetingJoinOptionsProps {
  meeting: IMeeting;
  isHost: boolean;
  onlineParticipantsCount: number;
  isJoining: boolean;
  isLocked: boolean;
  onJoinTraditional: () => void;
  onJoinLiveKit: () => void;
  onBack: () => void;
}

/**
 * Component to choose between Traditional Meeting and LiveKit Meeting
 * Similar to Google Meet's join options
 */
export function MeetingJoinOptions({
  meeting,
  isHost,
  onlineParticipantsCount,
  isJoining,
  isLocked,
  onJoinTraditional,
  onJoinLiveKit,
  onBack,
}: MeetingJoinOptionsProps) {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <Card className="bg-gray-800 border-gray-700 max-w-2xl w-full mx-4">
        <CardHeader>
          <CardTitle className="text-white text-center text-2xl">{meeting.title}</CardTitle>
          <div className="text-center text-gray-400 mt-2">
            <p className="text-sm">
              {onlineParticipantsCount} / {meeting.max_participants} participants
            </p>
            {isLocked && !isHost && (
              <Badge variant="destructive" className="mt-2">Meeting is locked</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-gray-300 text-center mb-4">
              Choose your meeting experience:
            </p>
            
            {/* LiveKit Option - Enhanced Video */}
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none h-auto py-6 flex flex-col items-start gap-3"
              onClick={onJoinLiveKit}
              disabled={isJoining || (isLocked && !isHost)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Video className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-lg">LiveKit Meeting</div>
                  <div className="text-sm text-white/80 font-normal">
                    Enhanced video quality with SFU technology
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  <Zap className="w-3 h-3 mr-1" />
                  Recommended
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-white/70 w-full pl-12">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Better quality</span>
                </div>
                <div className="flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  <span>Screen sharing</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Scalable</span>
                </div>
              </div>
            </Button>
            
            {/* Traditional Meeting Option */}
            <Button
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white h-auto py-6 flex flex-col items-start gap-3"
              onClick={onJoinTraditional}
              disabled={isJoining || (isLocked && !isHost)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 bg-gray-700 rounded-lg">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-lg">Traditional Meeting</div>
                  <div className="text-sm text-gray-400 font-normal">
                    Standard WebRTC peer-to-peer connection
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 w-full pl-12">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>P2P connection</span>
                </div>
                <div className="flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  <span>Basic features</span>
                </div>
              </div>
            </Button>
          </div>
          
          {/* Loading indicator */}
          {isJoining && (
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Joining meeting...</span>
            </div>
          )}
          
          {/* Back button */}
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={onBack}
            disabled={isJoining}
          >
            Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

