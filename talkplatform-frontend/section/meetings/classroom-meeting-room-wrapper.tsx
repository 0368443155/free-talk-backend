"use client";

import { useEffect, useState } from "react";
import { MeetingRoom } from "./meeting-room";
import { getMeetingApi, IMeeting } from "@/api/meeting.rest";
import { IUserInfo } from "@/api/user.rest";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface ClassroomMeetingRoomWrapperProps {
  classroomId: string;
  meetingId: string;
  user: IUserInfo;
}

export function ClassroomMeetingRoomWrapper({ classroomId, meetingId, user }: ClassroomMeetingRoomWrapperProps) {
  const [meeting, setMeeting] = useState<IMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconnectKey, setReconnectKey] = useState(0);

  const fetchMeeting = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMeetingApi(classroomId, meetingId);
      setMeeting(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load meeting");
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = () => {
    console.log("Reconnecting to meeting...");
    setReconnectKey(prev => prev + 1);
    fetchMeeting();
  };

  useEffect(() => {
    fetchMeeting();
  }, [classroomId, meetingId]);

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

  return <MeetingRoom key={reconnectKey} meeting={meeting} user={user} classroomId={classroomId} onReconnect={handleReconnect} />;
}

