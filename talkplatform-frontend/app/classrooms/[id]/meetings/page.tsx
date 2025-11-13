"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/store/user-store";
import {
  getClassroomApi,
  getClassroomMeetingsApi,
  createClassroomMeetingApi,
  IClassroom,
  IClassroomMeeting,
} from "@/api/classrooms.rest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Video, Plus, Users, Calendar, Clock, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format, formatDistanceToNow } from "date-fns";

export default function ClassroomMeetingsPage() {
  const router = useRouter();
  const params = useParams();
  const classroomId = params.id as string;
  const { userInfo: user } = useUser();
  const { toast } = useToast();

  const [classroom, setClassroom] = useState<IClassroom | null>(null);
  const [meetings, setMeetings] = useState<IClassroomMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    max_participants: "100",
  });

  const isTeacher = classroom?.teacher?.id === user?.id || user?.role === 'admin';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classroomData, meetingsData] = await Promise.all([
        getClassroomApi(classroomId),
        getClassroomMeetingsApi(classroomId),
      ]);
      setClassroom(classroomData);
      setMeetings(meetingsData.data);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [user, classroomId]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Meeting title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      await createClassroomMeetingApi(classroomId, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        scheduled_at: formData.scheduled_at || undefined,
        max_participants: parseInt(formData.max_participants) || 100,
      });

      toast({
        title: "Success",
        description: "Meeting created successfully!",
      });

      setFormData({ title: "", description: "", scheduled_at: "", max_participants: "100" });
      setCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to create meeting:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create meeting",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      scheduled: 'default',
      live: 'default',
      ended: 'secondary',
      cancelled: 'destructive',
    };
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-500',
      live: 'bg-green-500',
      ended: 'bg-gray-500',
      cancelled: 'bg-red-500',
    };

    return (
      <Badge variant={variants[status] || 'default'} className={colors[status]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/classrooms')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classrooms
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{classroom?.name}</h1>
            <p className="text-muted-foreground mt-1">
              Teacher: {classroom?.teacher?.username}
            </p>
            {classroom?.description && (
              <p className="text-sm text-muted-foreground mt-2">{classroom.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            {isTeacher && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Meeting
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Meeting</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateMeeting} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Meeting Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Weekly Discussion"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Meeting agenda..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="scheduled_at">Schedule Time (Optional)</Label>
                      <Input
                        id="scheduled_at"
                        type="datetime-local"
                        value={formData.scheduled_at}
                        onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_participants">Max Participants</Label>
                      <Input
                        id="max_participants"
                        type="number"
                        value={formData.max_participants}
                        onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                        min="2"
                        max="1000"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creating}>
                        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Create
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Meetings List */}
      {meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No meetings yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              {isTeacher
                ? 'Create your first meeting to get started!'
                : 'No meetings scheduled for this classroom yet.'}
            </p>
            {isTeacher && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Meeting
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <Card
              key={meeting.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/meetings/${meeting.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      {meeting.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {meeting.description || 'No description'}
                    </CardDescription>
                  </div>
                  {getStatusBadge(meeting.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Host: {meeting.host.username}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {meeting.current_participants}/{meeting.max_participants} participants
                    </span>
                  </div>
                  {meeting.scheduled_at && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(meeting.scheduled_at), 'MMM dd, yyyy')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Created {formatDistanceToNow(new Date(meeting.created_at))} ago</span>
                  </div>
                </div>
                <Button className="w-full mt-4" disabled={meeting.status === 'ended' || meeting.status === 'cancelled'}>
                  {meeting.status === 'live' ? 'Join Meeting' : 'View Details'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
