"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, DollarSign, Mic, Video, Clock, MapPin, Tag } from 'lucide-react';
import { useUser } from '@/store/user-store';
import { useToast } from '@/components/ui/use-toast';
import { 
  createPublicMeetingApi,
  MeetingType, 
  MeetingLevel,
  PricingType,
  ICreateMeeting 
} from '@/api/meeting.rest';

export default function CreateMeetingPage() {
  const router = useRouter();
  const { userInfo: user, isAuthenticated } = useUser();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [meetingData, setMeetingData] = useState<ICreateMeeting>({
    title: '',
    description: '',
    meeting_type: MeetingType.FREE_TALK,
    max_participants: 4,
    language: 'English',
    level: MeetingLevel.ALL,
    topic: '',
    is_audio_first: true,
    pricing_type: PricingType.FREE,
    price_credits: 0,
    region: '',
    tags: [],
    requires_approval: false,
    is_private: false,
    is_locked: false,
    allow_microphone: true,
    participants_can_unmute: true,
    settings: {
      allow_screen_share: true,
      allow_chat: true,
      allow_reactions: true,
      record_meeting: false,
      waiting_room: false,
      auto_record: false,
      mute_on_join: false,
    },
  });

  const [currentTag, setCurrentTag] = useState('');

  const handleMeetingTypeChange = (type: MeetingType) => {
    const updatedData = { ...meetingData, meeting_type: type };
    
    // Set defaults based on meeting type
    switch (type) {
      case MeetingType.FREE_TALK:
        updatedData.max_participants = 4;
        updatedData.is_audio_first = true;
        updatedData.pricing_type = PricingType.FREE;
        updatedData.price_credits = 0;
        updatedData.requires_approval = false;
        break;
      case MeetingType.TEACHER_CLASS:
        updatedData.max_participants = 100;
        updatedData.is_audio_first = false;
        updatedData.pricing_type = PricingType.CREDITS;
        updatedData.price_credits = 1;
        updatedData.requires_approval = false;
        break;
      case MeetingType.WORKSHOP:
        updatedData.max_participants = 50;
        updatedData.is_audio_first = false;
        updatedData.pricing_type = PricingType.CREDITS;
        updatedData.price_credits = 5;
        updatedData.requires_approval = true;
        break;
      case MeetingType.PRIVATE_SESSION:
        updatedData.max_participants = 2;
        updatedData.is_audio_first = false;
        updatedData.pricing_type = PricingType.CREDITS;
        updatedData.price_credits = 10;
        updatedData.requires_approval = true;
        break;
    }
    
    setMeetingData(updatedData);
  };

  const addTag = () => {
    if (currentTag.trim() && !meetingData.tags?.includes(currentTag.trim())) {
      setMeetingData({
        ...meetingData,
        tags: [...(meetingData.tags || []), currentTag.trim()]
      });
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMeetingData({
      ...meetingData,
      tags: meetingData.tags?.filter(tag => tag !== tagToRemove) || []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!meetingData.title.trim()) {
      toast({
        title: "Error",
        description: "Please provide a meeting title.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const meeting = await createPublicMeetingApi(meetingData);
      
      toast({
        title: "Success",
        description: "Meeting created successfully!",
      });
      
      // Redirect to the new meeting
      router.push(`/meetings/${meeting.id}`);
    } catch (error: any) {
      console.error('Failed to create meeting:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create meeting",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const getMeetingTypeDescription = (type: MeetingType) => {
    switch (type) {
      case MeetingType.FREE_TALK:
        return "Quick informal conversations with up to 4 people. Perfect for language practice and casual chat.";
      case MeetingType.TEACHER_CLASS:
        return "Structured teaching sessions with many students. Share knowledge and earn credits.";
      case MeetingType.WORKSHOP:
        return "Interactive group learning sessions. Higher engagement with smaller groups.";
      case MeetingType.PRIVATE_SESSION:
        return "One-on-one or small group sessions. Premium personalized experience.";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a Meeting</h1>
          <p className="text-gray-600">Set up your conversation space and connect with others</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Meeting Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={meetingData.meeting_type} onValueChange={handleMeetingTypeChange}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value={MeetingType.FREE_TALK}>Free Talk</TabsTrigger>
                  <TabsTrigger value={MeetingType.TEACHER_CLASS}>Teaching</TabsTrigger>
                  <TabsTrigger value={MeetingType.WORKSHOP}>Workshop</TabsTrigger>
                  <TabsTrigger value={MeetingType.PRIVATE_SESSION}>Private</TabsTrigger>
                </TabsList>
                
                {Object.values(MeetingType).map((type) => (
                  <TabsContent key={type} value={type} className="mt-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">{getMeetingTypeDescription(type)}</p>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  value={meetingData.title}
                  onChange={(e) => setMeetingData({ ...meetingData, title: e.target.value })}
                  placeholder="Enter a catchy title for your meeting"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={meetingData.description}
                  onChange={(e) => setMeetingData({ ...meetingData, description: e.target.value })}
                  placeholder="Describe what participants can expect..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={meetingData.language} onValueChange={(value) => setMeetingData({ ...meetingData, language: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="Japanese">Japanese</SelectItem>
                      <SelectItem value="Korean">Korean</SelectItem>
                      <SelectItem value="Chinese">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="level">Level</Label>
                  <Select value={meetingData.level} onValueChange={(value) => setMeetingData({ ...meetingData, level: value as MeetingLevel })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MeetingLevel.ALL}>All Levels</SelectItem>
                      <SelectItem value={MeetingLevel.BEGINNER}>Beginner</SelectItem>
                      <SelectItem value={MeetingLevel.INTERMEDIATE}>Intermediate</SelectItem>
                      <SelectItem value={MeetingLevel.ADVANCED}>Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  value={meetingData.topic}
                  onChange={(e) => setMeetingData({ ...meetingData, topic: e.target.value })}
                  placeholder="What will you talk about?"
                />
              </div>

              <div>
                <Label htmlFor="region">Region (Optional)</Label>
                <Input
                  id="region"
                  value={meetingData.region}
                  onChange={(e) => setMeetingData({ ...meetingData, region: e.target.value })}
                  placeholder="e.g., US-West, EU-Central"
                />
              </div>
            </CardContent>
          </Card>

          {/* Meeting Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_participants">Max Participants</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    min="2"
                    max="1000"
                    value={meetingData.max_participants}
                    onChange={(e) => setMeetingData({ ...meetingData, max_participants: parseInt(e.target.value) || 4 })}
                  />
                </div>

                {meetingData.pricing_type === PricingType.CREDITS && (
                  <div>
                    <Label htmlFor="price_credits">Price (Credits)</Label>
                    <Input
                      id="price_credits"
                      type="number"
                      min="0"
                      value={meetingData.price_credits}
                      onChange={(e) => setMeetingData({ ...meetingData, price_credits: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Audio-First Meeting</Label>
                    <p className="text-sm text-gray-500">Emphasize voice communication over video</p>
                  </div>
                  <Switch
                    checked={meetingData.is_audio_first}
                    onCheckedChange={(checked) => setMeetingData({ ...meetingData, is_audio_first: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Requires Approval</Label>
                    <p className="text-sm text-gray-500">Host must approve participants before they can join</p>
                  </div>
                  <Switch
                    checked={meetingData.requires_approval}
                    onCheckedChange={(checked) => setMeetingData({ ...meetingData, requires_approval: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Private Meeting</Label>
                    <p className="text-sm text-gray-500">Not visible in public listings</p>
                  </div>
                  <Switch
                    checked={meetingData.is_private}
                    onCheckedChange={(checked) => setMeetingData({ ...meetingData, is_private: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  placeholder="Add a tag (e.g., conversation, grammar, business)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Tag className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              
              {meetingData.tags && meetingData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {meetingData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Meeting'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}