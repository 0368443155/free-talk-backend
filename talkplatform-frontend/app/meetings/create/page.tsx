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
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl relative">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob -z-10"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 -z-10"></div>

        <div className="mb-8 text-center md:text-left">
          <h1 className="text-4xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-2">Create a Meeting</h1>
          <p className="text-muted-foreground text-lg">Set up your conversation space and connect with others</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Meeting Type Selection */}
          <Card className="glass-card border-white/20">
            <CardHeader>
              <CardTitle className="font-heading text-xl">Meeting Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={meetingData.meeting_type} onValueChange={(value) => handleMeetingTypeChange(value as MeetingType)}>
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-black/5 dark:bg-white/10">
                  <TabsTrigger value={MeetingType.FREE_TALK}>Free Talk</TabsTrigger>
                  <TabsTrigger value={MeetingType.TEACHER_CLASS}>Teaching</TabsTrigger>
                  <TabsTrigger value={MeetingType.WORKSHOP}>Workshop</TabsTrigger>
                  <TabsTrigger value={MeetingType.PRIVATE_SESSION}>Private</TabsTrigger>
                </TabsList>

                {Object.values(MeetingType).map((type) => (
                  <TabsContent key={type} value={type} className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-6 bg-primary/5 border border-primary/10 rounded-xl flex items-start gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {type === MeetingType.FREE_TALK && <Users className="w-6 h-6 text-primary" />}
                        {type === MeetingType.TEACHER_CLASS && <Video className="w-6 h-6 text-primary" />}
                        {type === MeetingType.WORKSHOP && <Users className="w-6 h-6 text-primary" />}
                        {type === MeetingType.PRIVATE_SESSION && <Mic className="w-6 h-6 text-primary" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-primary mb-1">
                          {type === MeetingType.FREE_TALK && "Free Talk"}
                          {type === MeetingType.TEACHER_CLASS && "Teacher Class"}
                          {type === MeetingType.WORKSHOP && "Workshop"}
                          {type === MeetingType.PRIVATE_SESSION && "Private Session"}
                        </h4>
                        <p className="text-sm text-muted-foreground">{getMeetingTypeDescription(type)}</p>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="glass-card border-white/20">
            <CardHeader>
              <CardTitle className="font-heading text-xl">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  value={meetingData.title}
                  onChange={(e) => setMeetingData({ ...meetingData, title: e.target.value })}
                  placeholder="Enter a catchy title for your meeting"
                  required
                  className="bg-white/50 dark:bg-black/20 border-white/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={meetingData.description}
                  onChange={(e) => setMeetingData({ ...meetingData, description: e.target.value })}
                  placeholder="Describe what participants can expect..."
                  rows={3}
                  className="bg-white/50 dark:bg-black/20 border-white/20 focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={meetingData.language} onValueChange={(value) => setMeetingData({ ...meetingData, language: value })}>
                    <SelectTrigger className="bg-white/50 dark:bg-black/20 border-white/20">
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

                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Select value={meetingData.level} onValueChange={(value) => setMeetingData({ ...meetingData, level: value as MeetingLevel })}>
                    <SelectTrigger className="bg-white/50 dark:bg-black/20 border-white/20">
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

              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  value={meetingData.topic}
                  onChange={(e) => setMeetingData({ ...meetingData, topic: e.target.value })}
                  placeholder="What will you talk about?"
                  className="bg-white/50 dark:bg-black/20 border-white/20 focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region (Optional)</Label>
                <Input
                  id="region"
                  value={meetingData.region}
                  onChange={(e) => setMeetingData({ ...meetingData, region: e.target.value })}
                  placeholder="e.g., US-West, EU-Central"
                  className="bg-white/50 dark:bg-black/20 border-white/20 focus:border-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Meeting Settings */}
          <Card className="glass-card border-white/20">
            <CardHeader>
              <CardTitle className="font-heading text-xl">Meeting Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="max_participants">Max Participants</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="max_participants"
                      type="number"
                      min="2"
                      max="1000"
                      value={meetingData.max_participants}
                      onChange={(e) => setMeetingData({ ...meetingData, max_participants: parseInt(e.target.value) || 4 })}
                      className="pl-9 bg-white/50 dark:bg-black/20 border-white/20 focus:border-primary"
                    />
                  </div>
                </div>

                {meetingData.pricing_type === PricingType.CREDITS && (
                  <div className="space-y-2">
                    <Label htmlFor="price_credits">Price (Credits)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="price_credits"
                        type="number"
                        min="0"
                        value={meetingData.price_credits}
                        onChange={(e) => setMeetingData({ ...meetingData, price_credits: parseInt(e.target.value) || 0 })}
                        className="pl-9 bg-white/50 dark:bg-black/20 border-white/20 focus:border-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Audio-First Meeting</Label>
                    <p className="text-sm text-muted-foreground">Emphasize voice communication over video</p>
                  </div>
                  <Switch
                    checked={meetingData.is_audio_first}
                    onCheckedChange={(checked) => setMeetingData({ ...meetingData, is_audio_first: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Requires Approval</Label>
                    <p className="text-sm text-muted-foreground">Host must approve participants before they can join</p>
                  </div>
                  <Switch
                    checked={meetingData.requires_approval}
                    onCheckedChange={(checked) => setMeetingData({ ...meetingData, requires_approval: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="text-base">Private Meeting</Label>
                    <p className="text-sm text-muted-foreground">Not visible in public listings</p>
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
          <Card className="glass-card border-white/20">
            <CardHeader>
              <CardTitle className="font-heading text-xl">Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  placeholder="Add a tag (e.g., conversation, grammar, business)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="bg-white/50 dark:bg-black/20 border-white/20 focus:border-primary"
                />
                <Button type="button" onClick={addTag} variant="outline" className="border-primary/20 hover:bg-primary/10 hover:text-primary">
                  <Tag className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {meetingData.tags && meetingData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {meetingData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors px-3 py-1" onClick={() => removeTag(tag)}>
                      {tag} <span className="ml-1 opacity-70">×</span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={() => router.back()} className="hover:bg-white/10">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-lg shadow-primary/25 min-w-[150px]">
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