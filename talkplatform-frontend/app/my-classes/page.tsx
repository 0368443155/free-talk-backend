"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar,
  Clock,
  Users,
  Star,
  Play,
  BookOpen,
  GraduationCap,
  MessageCircle,
  Video,
  Loader2,
  Plus,
  Filter
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '@/store/user-store';

// Mock data - replace with API calls
const mockEnrolledClasses = [
  {
    id: '1',
    title: 'English Conversation Practice',
    teacher: 'Sarah Johnson',
    teacherAvatar: '/avatars/teacher1.jpg',
    type: 'group',
    status: 'upcoming',
    scheduledAt: '2024-01-15T14:00:00Z',
    duration: 60,
    participants: 4,
    maxParticipants: 8,
    price: 10,
    description: 'Practice everyday English conversation with other students',
    language: 'English',
    level: 'Intermediate',
    roomId: 'room_123'
  },
  {
    id: '2',
    title: 'Business English Workshop',
    teacher: 'Michael Chen',
    teacherAvatar: '/avatars/teacher2.jpg',
    type: 'private',
    status: 'completed',
    scheduledAt: '2024-01-10T10:00:00Z',
    duration: 45,
    participants: 1,
    maxParticipants: 1,
    price: 25,
    description: 'One-on-one business English coaching session',
    language: 'English',
    level: 'Advanced',
    rating: 5,
    roomId: 'room_456'
  },
  {
    id: '3',
    title: 'Spanish Grammar Fundamentals',
    teacher: 'Maria Rodriguez',
    teacherAvatar: '/avatars/teacher3.jpg',
    type: 'group',
    status: 'live',
    scheduledAt: '2024-01-12T16:00:00Z',
    duration: 90,
    participants: 6,
    maxParticipants: 10,
    price: 15,
    description: 'Master Spanish grammar basics with interactive exercises',
    language: 'Spanish',
    level: 'Beginner',
    roomId: 'room_789'
  }
];

const mockTeachingClasses = [
  {
    id: '4',
    title: 'French Pronunciation Masterclass',
    students: ['John Doe', 'Jane Smith', 'Alex Johnson'],
    type: 'group',
    status: 'upcoming',
    scheduledAt: '2024-01-16T18:00:00Z',
    duration: 75,
    participants: 3,
    maxParticipants: 6,
    price: 20,
    description: 'Perfect your French pronunciation with native speaker techniques',
    language: 'French',
    level: 'Intermediate',
    roomId: 'room_101'
  }
];

export default function MyClassesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { userInfo: user, isAuthenticated } = useUser();

  const [enrolledClasses, setEnrolledClasses] = useState(mockEnrolledClasses);
  const [teachingClasses, setTeachingClasses] = useState(mockTeachingClasses);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('enrolled');

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadClasses();
  }, [isAuthenticated, router]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      // TODO: Implement API calls
      // const enrolledResponse = await getEnrolledClasses();
      // const teachingResponse = isTeacher ? await getTeachingClasses() : null;
      // setEnrolledClasses(enrolledResponse.data);
      // if (teachingResponse) setTeachingClasses(teachingResponse.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load classes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinClass = async (classItem: any) => {
    try {
      if (classItem.status === 'live') {
        router.push(`/meetings/${classItem.roomId}`);
      } else if (classItem.status === 'upcoming') {
        const now = new Date();
        const classTime = new Date(classItem.scheduledAt);
        const timeDiff = classTime.getTime() - now.getTime();
        const minutesUntil = Math.floor(timeDiff / (1000 * 60));

        if (minutesUntil > 15) {
          toast({
            title: "Class not yet available",
            description: `Class starts in ${minutesUntil} minutes. You can join 15 minutes before start time.`,
            variant: "destructive",
          });
          return;
        }
        
        router.push(`/meetings/${classItem.roomId}`);
      }

      toast({
        title: "Joining class...",
        description: "Connecting to your classroom",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to join class",
        variant: "destructive",
      });
    }
  };

  const leaveReview = (classId: string, teacherId: string) => {
    router.push(`/teachers/${teacherId}/review?class=${classId}`);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      live: { variant: 'default' as const, color: 'bg-green-500', text: 'Live Now' },
      upcoming: { variant: 'secondary' as const, color: 'bg-blue-500', text: 'Upcoming' },
      completed: { variant: 'outline' as const, color: 'bg-gray-500', text: 'Completed' },
      cancelled: { variant: 'destructive' as const, color: 'bg-red-500', text: 'Cancelled' }
    };
    
    return variants[status as keyof typeof variants] || variants.upcoming;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const ClassCard = ({ classItem, isTeaching = false }: { classItem: any, isTeaching?: boolean }) => {
    const statusBadge = getStatusBadge(classItem.status);
    const { date, time } = formatDateTime(classItem.scheduledAt);

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{classItem.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={statusBadge.variant}>
                    {statusBadge.text}
                  </Badge>
                  <Badge variant="outline">{classItem.type}</Badge>
                  <Badge variant="secondary">{classItem.language}</Badge>
                </div>
              </div>
              {classItem.status === 'live' && (
                <div className="flex items-center gap-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Live</span>
                </div>
              )}
            </div>

            {/* Teacher/Students Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {isTeaching ? 'TC' : classItem.teacher?.split(' ').map((n: string) => n[0]).join('')}
                </span>
              </div>
              <div>
                {isTeaching ? (
                  <p className="font-medium">Teaching Class</p>
                ) : (
                  <p className="font-medium">{classItem.teacher}</p>
                )}
                <p className="text-sm text-gray-600">
                  {isTeaching 
                    ? `${classItem.participants}/${classItem.maxParticipants} students enrolled`
                    : `${classItem.participants}/${classItem.maxParticipants} participants`
                  }
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 line-clamp-2">{classItem.description}</p>

            {/* Class Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{time} ({classItem.duration}min)</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span>{classItem.level} Level</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <span>{classItem.price} Credits</span>
              </div>
            </div>

            {/* Students List for Teaching Classes */}
            {isTeaching && classItem.students && (
              <div>
                <p className="text-sm font-medium mb-2">Enrolled Students:</p>
                <div className="flex flex-wrap gap-1">
                  {classItem.students.map((student: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {student}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {classItem.status === 'live' && (
                <Button 
                  className="flex-1" 
                  onClick={() => joinClass(classItem)}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Join Now
                </Button>
              )}
              
              {classItem.status === 'upcoming' && (
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => joinClass(classItem)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Join Class
                </Button>
              )}

              {classItem.status === 'completed' && !isTeaching && !classItem.rating && (
                <Button 
                  variant="outline" 
                  onClick={() => leaveReview(classItem.id, classItem.teacherId)}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Leave Review
                </Button>
              )}

              {classItem.status === 'completed' && classItem.rating && (
                <div className="flex items-center gap-1 text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${i < classItem.rating ? 'fill-current' : ''}`} 
                    />
                  ))}
                  <span className="text-sm text-gray-600 ml-1">Your rating</span>
                </div>
              )}

              <Button variant="ghost" size="sm">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
              <p className="text-gray-600 mt-1">Manage your enrolled and teaching classes</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/teachers')}>
                <BookOpen className="w-4 h-4 mr-2" />
                Find Classes
              </Button>
              {isTeacher && (
                <Button onClick={() => router.push('/teacher/create-class')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Class
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="enrolled" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Enrolled Classes ({enrolledClasses.length})
            </TabsTrigger>
            {isTeacher && (
              <TabsTrigger value="teaching" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Teaching ({teachingClasses.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="enrolled">
            <div className="space-y-6">
              {enrolledClasses.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {enrolledClasses.map((classItem) => (
                    <ClassCard key={classItem.id} classItem={classItem} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No enrolled classes</h3>
                  <p className="text-gray-600 mb-4">Start learning by enrolling in a class</p>
                  <Button onClick={() => router.push('/teachers')}>
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Browse Teachers
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {isTeacher && (
            <TabsContent value="teaching">
              <div className="space-y-6">
                {teachingClasses.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {teachingClasses.map((classItem) => (
                      <ClassCard key={classItem.id} classItem={classItem} isTeaching={true} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No teaching classes</h3>
                    <p className="text-gray-600 mb-4">Start teaching by creating your first class</p>
                    <Button onClick={() => router.push('/teacher/create-class')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Class
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}