"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Users, Clock, DollarSign, MapPin, Star, Mic, Video, Globe, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/store/user-store';
import { 
  getFreeTalkRoomsApi, 
  getTeacherClassesApi, 
  getNearbyMeetingsApi,
  IMeeting, 
  MeetingType, 
  MeetingLevel,
  PricingType,
  RoomStatus 
} from '@/api/meeting.rest';

export default function LobbyPage() {
  const router = useRouter();
  const { userInfo: user, isLoading: userLoading, isAuthenticated } = useUser();
  
  // State for free talk rooms
  const [freeTalkRooms, setFreeTalkRooms] = useState<IMeeting[]>([]);
  const [freeTalkLoading, setFreeTalkLoading] = useState(false);
  
  // State for teacher classes
  const [teacherClasses, setTeacherClasses] = useState<IMeeting[]>([]);
  const [teacherClassesLoading, setTeacherClassesLoading] = useState(false);
  
  // State for nearby meetings
  const [nearbyMeetings, setNearbyMeetings] = useState<IMeeting[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  
  // Filters
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [priceRangeFilter, setPriceRangeFilter] = useState<{ min?: number; max?: number }>({});

  // Auto-detect user region (simplified - in production use IP geolocation)
  const [userRegion, setUserRegion] = useState<string>('US-West');

  useEffect(() => {
    if (isAuthenticated) {
      loadFreeTalkRooms();
      loadTeacherClasses();
      loadNearbyMeetings();
    }
  }, [isAuthenticated]);

  const loadFreeTalkRooms = async () => {
    setFreeTalkLoading(true);
    try {
      const filters = {
        language: languageFilter && languageFilter !== 'all' ? languageFilter : undefined,
        level: levelFilter && levelFilter !== 'all' ? (levelFilter as MeetingLevel) : undefined,
        region: regionFilter || undefined,
      };
      const response = await getFreeTalkRoomsApi(filters);
      setFreeTalkRooms(response.data);
    } catch (error) {
      console.error('Failed to load free talk rooms:', error);
    } finally {
      setFreeTalkLoading(false);
    }
  };

  const loadTeacherClasses = async () => {
    setTeacherClassesLoading(true);
    try {
      const filters = {
        language: languageFilter && languageFilter !== 'all' ? languageFilter : undefined,
        level: levelFilter && levelFilter !== 'all' ? (levelFilter as MeetingLevel) : undefined,
        min_price: priceRangeFilter.min,
        max_price: priceRangeFilter.max,
      };
      const response = await getTeacherClassesApi(filters);
      setTeacherClasses(response.data);
    } catch (error) {
      console.error('Failed to load teacher classes:', error);
    } finally {
      setTeacherClassesLoading(false);
    }
  };

  const loadNearbyMeetings = async () => {
    setNearbyLoading(true);
    try {
      const response = await getNearbyMeetingsApi(userRegion);
      setNearbyMeetings(response.data);
    } catch (error) {
      console.error('Failed to load nearby meetings:', error);
    } finally {
      setNearbyLoading(false);
    }
  };

  const getRoomStatusColor = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.EMPTY: return 'bg-gray-500';
      case RoomStatus.AVAILABLE: return 'bg-green-500';
      case RoomStatus.CROWDED: return 'bg-yellow-500';
      case RoomStatus.FULL: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoomStatusText = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.EMPTY: return 'Empty';
      case RoomStatus.AVAILABLE: return 'Available';
      case RoomStatus.CROWDED: return 'Crowded';
      case RoomStatus.FULL: return 'Full';
      default: return 'Unknown';
    }
  };

  const joinMeeting = (meetingId: string) => {
    router.push(`/meetings/${meetingId}`);
  };

  const FreeTalkRoomCard = ({ meeting }: { meeting: IMeeting }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{meeting.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={`${getRoomStatusColor(meeting.room_status!)} text-white`}>
              {getRoomStatusText(meeting.room_status!)}
            </Badge>
            {meeting.is_audio_first && <Badge variant="outline"><Mic className="w-3 h-3 mr-1" />Audio First</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {meeting.current_participants}/{meeting.max_participants}
            </span>
            {meeting.language && (
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {meeting.language}
              </span>
            )}
            {meeting.level && (
              <Badge variant="secondary">{meeting.level}</Badge>
            )}
          </div>
        </div>
        {meeting.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{meeting.description}</p>
        )}
        {meeting.topic && (
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">Topic:</span>
            <span className="text-sm text-gray-600">{meeting.topic}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2">
          <div className="text-xs text-gray-500">
            Host: {meeting.host?.username || 'Unknown'}
          </div>
          <Button 
            size="sm" 
            onClick={() => joinMeeting(meeting.id)}
            disabled={meeting.room_status === RoomStatus.FULL}
          >
            {meeting.room_status === RoomStatus.FULL ? 'Room Full' : 'Join'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const TeacherClassCard = ({ meeting }: { meeting: IMeeting }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{meeting.title}</CardTitle>
          <div className="flex items-center gap-2">
            {meeting.pricing_type === PricingType.CREDITS && (
              <Badge variant="default" className="bg-blue-600">
                <DollarSign className="w-3 h-3 mr-1" />
                {meeting.price_credits} credits
              </Badge>
            )}
            {meeting.pricing_type === PricingType.FREE && (
              <Badge variant="secondary">Free</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {meeting.current_participants}/{meeting.max_participants}
            </span>
            {meeting.scheduled_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(meeting.scheduled_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        {meeting.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{meeting.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {meeting.language && (
              <Badge variant="outline">{meeting.language}</Badge>
            )}
            {meeting.level && (
              <Badge variant="secondary">{meeting.level}</Badge>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Teacher: {meeting.host?.username || 'Unknown'}
          </div>
        </div>
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-600">4.8 (42 reviews)</span>
          </div>
          <Button 
            size="sm" 
            onClick={() => joinMeeting(meeting.id)}
            disabled={meeting.requires_approval}
          >
            {meeting.requires_approval ? 'Request to Join' : 'Join Class'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to TalkConnect</h1>
          <p className="text-gray-600">Discover conversations, learn from teachers, and connect with the community</p>
        </div>

        {/* Filters */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
          <div className="flex flex-wrap gap-4">
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Spanish">Spanish</SelectItem>
                <SelectItem value="French">French</SelectItem>
                <SelectItem value="German">German</SelectItem>
                <SelectItem value="Japanese">Japanese</SelectItem>
                <SelectItem value="Korean">Korean</SelectItem>
                <SelectItem value="Chinese">Chinese</SelectItem>
              </SelectContent>
            </Select>

            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value={MeetingLevel.BEGINNER}>Beginner</SelectItem>
                <SelectItem value={MeetingLevel.INTERMEDIATE}>Intermediate</SelectItem>
                <SelectItem value={MeetingLevel.ADVANCED}>Advanced</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Region (e.g., US-West)"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-48"
            />

            <Button onClick={() => {
              loadFreeTalkRooms();
              loadTeacherClasses();
            }} variant="outline">
              <Search className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </div>

        <Tabs defaultValue="free-talk" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="free-talk">Free Talk Rooms</TabsTrigger>
            <TabsTrigger value="teacher-classes">Teacher Classes</TabsTrigger>
            <TabsTrigger value="nearby">Nearby</TabsTrigger>
          </TabsList>

          <TabsContent value="free-talk" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Available Free Talk Rooms</h2>
              <Button onClick={() => router.push('/meetings/create')}>
                Create Room
              </Button>
            </div>
            
            {freeTalkLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {freeTalkRooms.map((meeting) => (
                  <FreeTalkRoomCard key={meeting.id} meeting={meeting} />
                ))}
                {freeTalkRooms.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No free talk rooms available. Be the first to create one!
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="teacher-classes" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Teacher Classes & Workshops</h2>
              <Button onClick={() => router.push('/become-teacher')}>
                Become a Teacher
              </Button>
            </div>
            
            {teacherClassesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherClasses.map((meeting) => (
                  <TeacherClassCard key={meeting.id} meeting={meeting} />
                ))}
                {teacherClasses.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No teacher classes available at the moment.
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="nearby" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Nearby Meetings ({userRegion})</h2>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Based on your location</span>
              </div>
            </div>
            
            {nearbyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearbyMeetings.map((meeting) => (
                  meeting.meeting_type === MeetingType.FREE_TALK ? (
                    <FreeTalkRoomCard key={meeting.id} meeting={meeting} />
                  ) : (
                    <TeacherClassCard key={meeting.id} meeting={meeting} />
                  )
                ))}
                {nearbyMeetings.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No nearby meetings found in your region.
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}