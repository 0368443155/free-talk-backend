'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/store/user-store';
import { getClassroomApi, getClassroomMeetingsApi, createClassroomMeetingApi } from '@/api/classrooms.rest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  GraduationCap, 
  Loader2, 
  Plus, 
  RefreshCw,
  Users,
  Video
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Classroom {
  id: string;
  name: string;
  description?: string;
  teacher: {
    id: string;
    username: string;
    email: string;
  };
  is_active: boolean;
  created_at: string;
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduled_time?: string;
  status: string;
  host: {
    id: string;
    username: string;
  };
  participants?: any[];
  created_at: string;
}

export default function ClassroomMeetingsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { userInfo: user } = useUser();
  
  const classroomId = params.id as string;
  
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_time: '',
  });

  const isTeacher = user?.id === classroom?.teacher.id;

  useEffect(() => {
    if (classroomId) {
      fetchClassroom();
      fetchMeetings();
    }
  }, [classroomId]);

  const fetchClassroom = async () => {
    try {
      const data = await getClassroomApi(classroomId);
      setClassroom(data);
    } catch (error: any) {
      console.error('Failed to fetch classroom:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classroom',
        variant: 'destructive',
      });
    }
  };

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await getClassroomMeetingsApi(classroomId);
      console.log('📚 Classroom meetings:', response);
      setMeetings(response.data);
    } catch (error: any) {
      console.error('Failed to fetch meetings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load meetings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🎬 Creating meeting in classroom:', classroomId, formData);

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Meeting title is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      const result = await createClassroomMeetingApi(classroomId, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        scheduled_at: formData.scheduled_time || undefined,
      });

      console.log('✅ Meeting created:', result);

      toast({
        title: 'Success',
        description: 'Meeting created successfully!',
      });

      setFormData({ title: '', description: '', scheduled_time: '' });
      setCreateDialogOpen(false);
      fetchMeetings();
    } catch (error: any) {
      console.error('❌ Failed to create meeting:', error);
      console.error('Error details:', error.response?.data);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create meeting',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinMeeting = (meetingId: string) => {
    router.push(`/meetings/${meetingId}`);
  };

  if (!user) {
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
        <Button
          variant="ghost"
          onClick={() => router.push('/classrooms')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classrooms
        </Button>

        {classroom && (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <GraduationCap className="h-8 w-8" />
                {classroom.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                Teacher: {classroom.teacher.username}
              </p>
              {classroom.description && (
                <p className="text-muted-foreground mt-2">{classroom.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={fetchMeetings}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
                      <DialogTitle>Create Meeting</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateMeeting} className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Grammar Lesson 1"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="What will be covered in this meeting?"
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="scheduled_time">Schedule (Optional)</Label>
                        <Input
                          id="scheduled_time"
                          type="datetime-local"
                          value={formData.scheduled_time}
                          onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={creating}>
                          {creating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Meeting'
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Meetings List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !meetings || meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No meetings yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              {isTeacher
                ? 'Create your first meeting to get started!'
                : 'No meetings have been scheduled yet.'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((meeting) => (
            <Card
              key={meeting.id}
              className="hover:shadow-lg transition-all cursor-pointer"
              onClick={() => handleJoinMeeting(meeting.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  {meeting.title}
                </CardTitle>
                <CardDescription>
                  by {meeting.host.username}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {meeting.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {meeting.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  {meeting.scheduled_time && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(meeting.scheduled_time).toLocaleString()}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Created {formatDistanceToNow(new Date(meeting.created_at), { addSuffix: true })}
                  </div>

                  {meeting.participants && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {meeting.participants.length} participant(s)
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    meeting.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : meeting.status === 'scheduled'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}>
                    {meeting.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
