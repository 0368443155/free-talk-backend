"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Calendar, Users, Clock, Play, Trash2, Edit } from "lucide-react";
import { getMeetingsApi, IMeeting, MeetingStatus, startMeetingApi, deleteMeetingApi } from "@/api/meeting.rest";
import { IUserInfo } from "@/api/user.rest";
import { CreateMeetingDialog } from "./create-meeting-dialog";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface MeetingListProps {
  classroomId: string;
  user: IUserInfo;
  isTeacher: boolean;
}

export function MeetingList({ classroomId, user, isTeacher }: MeetingListProps) {
  const [meetings, setMeetings] = useState<IMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();
  const { toast } = useToast();

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await getMeetingsApi(classroomId, page, 10);
      setMeetings(response.data);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách meeting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [classroomId, page]);

  const handleStartMeeting = async (meetingId: string) => {
    try {
      await startMeetingApi(classroomId, meetingId);
      toast({
        title: "Thành công",
        description: "Meeting đã bắt đầu!",
      });
      router.push(`/classrooms/${classroomId}/meetings/${meetingId}`);
    } catch (error) {
      console.error("Failed to start meeting:", error);
      toast({
        title: "Lỗi",
        description: "Không thể bắt đầu meeting",
        variant: "destructive",
      });
    }
  };

  const handleJoinMeeting = (meetingId: string) => {
    router.push(`/classrooms/${classroomId}/meetings/${meetingId}`);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm("Bạn có chắc muốn xóa meeting này?")) return;

    try {
      await deleteMeetingApi(classroomId, meetingId);
      toast({
        title: "Thành công",
        description: "Đã xóa meeting",
      });
      fetchMeetings();
    } catch (error) {
      console.error("Failed to delete meeting:", error);
      toast({
        title: "Lỗi",
        description: "Không thể xóa meeting",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: MeetingStatus) => {
    const variants: Record<MeetingStatus, { variant: any; label: string }> = {
      [MeetingStatus.SCHEDULED]: { variant: "secondary", label: "Đã lên lịch" },
      [MeetingStatus.LIVE]: { variant: "default", label: "Đang diễn ra" },
      [MeetingStatus.ENDED]: { variant: "outline", label: "Đã kết thúc" },
      [MeetingStatus.CANCELLED]: { variant: "destructive", label: "Đã hủy" },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <div className="text-center py-8">Đang tải...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meetings</h2>
        {isTeacher && (
          <CreateMeetingDialog classroomId={classroomId} onSuccess={fetchMeetings} />
        )}
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Video className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Chưa có meeting nào</p>
            {isTeacher && <p className="text-sm mt-2">Tạo meeting đầu tiên để bắt đầu!</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      {meeting.title}
                    </CardTitle>
                    {meeting.description && (
                      <CardDescription className="mt-2">{meeting.description}</CardDescription>
                    )}
                  </div>
                  {getStatusBadge(meeting.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {meeting.scheduled_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(meeting.scheduled_at)}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {meeting.current_participants}/{meeting.max_participants} người
                    </div>
                    {meeting.status === MeetingStatus.LIVE && meeting.started_at && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Bắt đầu lúc {formatDate(meeting.started_at)}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {meeting.status === MeetingStatus.LIVE && (
                      <Button
                        onClick={() => handleJoinMeeting(meeting.id)}
                        className="flex-1"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Tham gia
                      </Button>
                    )}
                    
                    {isTeacher && meeting.status === MeetingStatus.SCHEDULED && (
                      <Button
                        onClick={() => handleStartMeeting(meeting.id)}
                        className="flex-1"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Bắt đầu
                      </Button>
                    )}

                    {isTeacher && meeting.status !== MeetingStatus.ENDED && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => router.push(`/classrooms/${classroomId}/meetings/${meeting.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Trước
          </Button>
          <span className="flex items-center px-4">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}

