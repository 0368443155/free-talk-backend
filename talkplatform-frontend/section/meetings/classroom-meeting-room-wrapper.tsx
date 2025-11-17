"use client";

import { useEffect, useState } from "react";
import { MeetingRoom } from "./meeting-room";
import { getMeetingApi, IMeeting } from "@/api/meeting.rest";
import { IUserInfo } from "@/api/user.rest";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface ClassroomMeetingRoomWrapperProps {
  classroomId: string;
  meetingId: string;
  user: IUserInfo;
}

export function ClassroomMeetingRoomWrapper({ classroomId, meetingId, user }: ClassroomMeetingRoomWrapperProps) {
  const [meeting, setMeeting] = useState<IMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string>('');
  const [reconnectKey, setReconnectKey] = useState(0);

  const fetchMeeting = async () => {
    // Don't fetch if already blocked
    if (isBlocked) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getMeetingApi(classroomId, meetingId);
      setMeeting(data);
    } catch (err: any) {
      // Check if user is blocked from this meeting
      if (err.response?.status === 403 && err.response?.data?.message?.includes('blocked')) {
        setIsBlocked(true);
        setBlockReason(err.response?.data?.message || 'You have been blocked from this meeting');
        setLoading(false); // Stop loading immediately
        return; // Don't proceed further
      } else {
        setError(err.response?.data?.message || "Failed to load meeting");
      }
    } finally {
      if (!isBlocked) { // Only set loading false if not blocked
        setLoading(false);
      }
    }
  };

  const handleReconnect = () => {
    console.log("Reconnecting to meeting...");
    setReconnectKey(prev => prev + 1);
    fetchMeeting();
  };

  const handleBackToDashboard = () => {
    setIsBlocked(false);
    window.location.href = '/dashboard';
  };

  useEffect(() => {
    // Don't fetch if already blocked
    if (!isBlocked) {
      fetchMeeting();
    }
  }, [classroomId, meetingId, isBlocked]);

  // Show blocked modal first, before loading screen
  if (isBlocked) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Access Denied</DialogTitle>
              <DialogDescription className="text-gray-700">
                {blockReason}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleBackToDashboard} className="w-full">
                Back to Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-white">Loading meeting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <p className="text-red-500">{error || "Meeting not found"}</p>
            <Button onClick={handleReconnect} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reconnect
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <MeetingRoom key={reconnectKey} meeting={meeting} user={user} classroomId={classroomId} onReconnect={handleReconnect} />
      
    </>
  );
}

