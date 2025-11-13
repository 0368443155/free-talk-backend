"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // SỬA LỖI: Thêm import
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
// SỬA LỖI: Thêm Loader2 vào import
import { Video, Plus, Calendar, Users, Lock, Unlock, Play, StopCircle, Trash2, LogIn, Loader2, FileText, Clock, UserPlus, Languages, GraduationCap, MessageSquare, Mic, MicOff, X } from "lucide-react";
import { format } from "date-fns";
import {
  getPublicMeetingsApi,
  createPublicMeetingApi,
  deletePublicMeetingApi,
  startPublicMeetingApi,
  endPublicMeetingApi,
  lockPublicMeetingApi,
  unlockPublicMeetingApi,
  IMeeting,
  MeetingStatus,
  MeetingLevel,
} from "@/api/meeting.rest";
import { useRouter } from "next/navigation";
import { useUser } from "@/store/user-store";

export default function PublicMeetings() { // SỬA LỖI: Đổi tên component thành 'export default'
  const { userInfo: user, isLoading: userLoading, isAuthenticated } = useUser() // SỬA LỖI: Lấy thêm `isAuthenticated`
  const [meetings, setMeetings] = useState<IMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMaxParticipantsAlert, setShowMaxParticipantsAlert] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_private: false,
    is_locked: false,
    scheduled_at: "",
    max_participants: 10,
    language: "",
    level: undefined as MeetingLevel | undefined,
    topic: "",
    allow_microphone: true,
    participants_can_unmute: true,
  });
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [showCustomLanguage, setShowCustomLanguage] = useState(false);
  const [customLanguage, setCustomLanguage] = useState("");

  const PREDEFINED_LANGUAGES = [
    { value: "English", label: "English", flag: "🇺🇸" },
    { value: "Korean", label: "Korean", flag: "🇰🇷" },
    { value: "Chinese", label: "Chinese", flag: "🇨🇳" },
    { value: "Japanese", label: "Japanese", flag: "🇯🇵" },
    { value: "Vietnamese", label: "Vietnamese", flag: "🇻🇳" },
  ];
  const { toast } = useToast();
  const router = useRouter(); // SỬA LỖI: Định nghĩa router 1 lần ở đây

  // Language helpers
  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev => {
      if (prev.includes(language)) {
        return prev.filter(l => l !== language);
      }
      return [...prev, language];
    });
  };

  const addCustomLanguage = () => {
    if (customLanguage.trim() && !selectedLanguages.includes(customLanguage.trim())) {
      setSelectedLanguages(prev => [...prev, customLanguage.trim()]);
      setCustomLanguage("");
      setShowCustomLanguage(false);
    }
  };

  const removeLanguage = (language: string) => {
    setSelectedLanguages(prev => prev.filter(l => l !== language));
  };

  // SỬA LỖI LOGIC: Đợi user load xong VÀ đã xác thực
  useEffect(() => {
    if (userLoading) {
      console.log('🌀 Waiting for auth state...');
      // Giữ `loading` là true trong khi chờ user load
      setLoading(true); 
      return;
    }

    // SỬA LỖI LOG: Chỉ đọc user.username (vì user.name không tồn tại)
    console.log('👤 User loaded:', { hasUser: !!user, userName: user?.username });

    // Nếu user load xong và KHÔNG xác thực
    if (!isAuthenticated) {
      console.log("🛑 User not authenticated, skipping fetch.");
      setLoading(false); // Dừng loading
      setMeetings([]); // Xóa meetings cũ
      return;
    }
    
    // Nếu đã xác thực, fetch meetings
    fetchMeetings();

  }, [user, userLoading, isAuthenticated]); // Phụ thuộc vào cả 3 trạng thái

  const fetchMeetings = async () => {
    setLoading(true); // Bắt đầu fetch
    try {
      // SỬA LỖI: Phiên bản này không dùng pagination, nên gọi API không tham số
      const response = await getPublicMeetingsApi(); 
      setMeetings(response.data);
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
      toast({
        title: "Error",
        description: "Failed to load meetings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a meeting",
        variant: "destructive",
      });
      return;
    }

    // Validate max participants
    if (formData.max_participants && formData.max_participants > 10) {
      setShowMaxParticipantsAlert(true);
      return;
    }

    try {
      await createPublicMeetingApi({
        ...formData,
        language: selectedLanguages.join(", "), // Join languages into a comma-separated string
        scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : undefined,
      });
      toast({
        title: "Success",
        description: "Meeting created successfully",
      });
      setShowCreateDialog(false);
      setFormData({
        title: "",
        description: "",
        is_private: false,
        is_locked: false,
        scheduled_at: "",
        max_participants: 10,
        language: "",
        level: undefined,
        topic: "",
        allow_microphone: true,
        participants_can_unmute: true,
      });
      setSelectedLanguages([]);
      setShowCustomLanguage(false);
      setCustomLanguage("");
      fetchMeetings(); // Tải lại danh sách
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create meeting",
        variant: "destructive",
      });
    }
  };

  const handleStartMeeting = async (meetingId: string) => {
    if (!user) return; // Đã check user ở logic ngoài
    try {
      await startPublicMeetingApi(meetingId);
      toast({ title: "Success", description: "Meeting started" });
      fetchMeetings();
    } catch (error) {
      toast({ title: "Error", description: "Failed to start meeting", variant: "destructive" });
    }
  };

  const handleEndMeeting = async (meetingId: string) => {
    if (!user) return;
    try {
      await endPublicMeetingApi(meetingId);
      toast({ title: "Success", description: "Meeting ended" });
      fetchMeetings();
    } catch (error) {
      toast({ title: "Error", description: "Failed to end meeting", variant: "destructive" });
    }
  };

  const handleLockMeeting = async (meetingId: string) => {
    if (!user) return;
    try {
      await lockPublicMeetingApi(meetingId);
      toast({ title: "Success", description: "Meeting locked" });
      fetchMeetings();
    } catch (error) {
      toast({ title: "Error", description: "Failed to lock meeting", variant: "destructive" });
    }
  };

  const handleUnlockMeeting = async (meetingId: string) => {
    if (!user) return;
    try {
      await unlockPublicMeetingApi(meetingId);
      toast({ title: "Success", description: "Meeting unlocked" });
      fetchMeetings();
    } catch (error) {
      toast({ title: "Error", description: "Failed to unlock meeting", variant: "destructive" });
    }
  };

  // SỬA LỖI LOGIC: Hàm này chỉ mở dialog
  const handleDeleteMeeting = (meetingId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in",
        variant: "destructive",
      });
      return;
    };
    setMeetingToDelete(meetingId);
    setShowDeleteConfirm(true);
  };

  // SỬA LỖI LOGIC: Hàm này thực thi việc xóa
  const confirmDelete = async () => {
    if (!meetingToDelete) return;

    try {
      await deletePublicMeetingApi(meetingToDelete);
      toast({
        title: "Success",
        description: "Meeting deleted",
      });
      fetchMeetings();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete meeting",
        variant: "destructive",
      });
    } finally {
      setShowDeleteConfirm(false);
      setMeetingToDelete(null);
    }
  };

  // SỬA LỖI: Xóa hàm trùng lặp

  const handleJoinMeeting = (meetingId: string) => {
    router.push(`/meetings/${meetingId}`);
  };

  // console.log(meetings); // Bỏ log này để đỡ rối console

  const getStatusBadge = (status: MeetingStatus) => {
    const variants: Record<MeetingStatus, { variant: any; label: string }> = {
      [MeetingStatus.SCHEDULED]: { variant: "secondary", label: "Scheduled" },
      [MeetingStatus.LIVE]: { variant: "default", label: "Live" },
      [MeetingStatus.ENDED]: { variant: "outline", label: "Ended" },
      [MeetingStatus.CANCELLED]: { variant: "destructive", label: "Cancelled" },
    };
    const { variant, label } = variants[status] || variants[MeetingStatus.SCHEDULED];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const isHost = (meeting: IMeeting) => {
    if (!user || !meeting.host) return false;
    // SỬA LỖI: API trả về user.id (từ file user.rest.ts) chứ không phải user.user_id
    // Đồng thời check host_id (từ IMeeting)
    // --- THÊM LOGS DEBUG Ở ĐÂY ---
    // console.log(`[Debug isHost] Meeting: ${meeting.title}`);
    // console.log(`[Debug isHost] 1. Meeting Host ID (từ CSDL):`, meeting.host_id);
    // console.log(`[Debug isHost] 2. Current User ID (từ user-store):`, user.id);
    // console.log(`[Debug isHost] 3. Current User UserID (từ user-store):`, user.user_id);
    // -------------------------
    return meeting.host.id === user.id;// || meeting.host_id === user.user_id;
  }

  // Sửa check loading
  if (userLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                <Video className="w-7 h-7 mr-3 text-blue-600" />
                Public Meetings
              </span>
              {user && (
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Meeting
                </Button>
              )}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Meetings List */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {meetings.length === 0 ? (
            <Card className="col-span-full border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  {!isAuthenticated ? "Please log in to see meetings." : "No public meetings available. Create your first meeting!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            meetings.map((meeting) => (
              <Card 
                key={meeting.id} 
                className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:scale-[1.02] group overflow-hidden relative"
              >
                {/* Gradient accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  meeting.status === MeetingStatus.LIVE 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                    : meeting.status === MeetingStatus.SCHEDULED
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    : 'bg-gradient-to-r from-gray-400 to-gray-500'
                }`}></div>

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2 mb-2 text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <span className="truncate">{meeting.title}</span>
                        {meeting.is_locked && (
                          <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {getStatusBadge(meeting.status)}
                      </div>
                      {meeting.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {meeting.description}
                        </p>
                      )}
                      {meeting.host && (
                        <div className="flex items-center gap-2 mt-3">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {meeting.host.username?.[0]?.toUpperCase() || meeting.host.email?.[0]?.toUpperCase() || 'H'}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {meeting.host.username || meeting.host.email}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      {meeting.scheduled_at && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span className="text-xs">{format(new Date(meeting.scheduled_at), "PPp")}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <span className="font-medium">{meeting.current_participants}/{meeting.max_participants}</span>
                      </div>
                    </div>
                    {(meeting.language || meeting.level || meeting.topic) && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {meeting.language && meeting.language.split(',').map((lang, idx) => (
                          <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                            <Languages className="w-3 h-3" />
                            {lang.trim()}
                          </Badge>
                        ))}
                        {meeting.level && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            {meeting.level === 'all' ? 'All levels' : meeting.level.charAt(0).toUpperCase() + meeting.level.slice(1)}
                          </Badge>
                        )}
                        {meeting.topic && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {meeting.topic}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {isHost(meeting) ? (
                      <>
                        {meeting.status === MeetingStatus.SCHEDULED && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStartMeeting(meeting.id)}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                        )}
                        {meeting.status === MeetingStatus.LIVE && (
                          <>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => handleEndMeeting(meeting.id)}
                              className="shadow-md hover:shadow-lg transition-all"
                            >
                              <StopCircle className="w-4 h-4 mr-1" />
                              End
                            </Button>
                            {meeting.is_locked ? (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleUnlockMeeting(meeting.id)}
                                className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              >
                                <Unlock className="w-4 h-4 mr-1" />
                                Unlock
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleLockMeeting(meeting.id)}
                                className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <Lock className="w-4 h-4 mr-1" />
                                Lock
                              </Button>
                            )}
                          </>
                        )}
                        
                        {/* SỬA LỖI LOGIC: Host cũng cần nút Join */}
                        {meeting.status === MeetingStatus.LIVE && !meeting.is_locked && (
                           <Button 
                             size="sm" 
                             onClick={() => handleJoinMeeting(meeting.id)}
                             className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                           >
                             <LogIn className="w-4 h-4 mr-1" />
                             Join
                           </Button>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </>
                    ) : (
                      // Logic cho người không phải Host
                      <>
                        {meeting.status === MeetingStatus.LIVE && (
                          <>
                            {meeting.is_locked ? (
                              <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
                                <Lock className="w-3 h-3 mr-1" />
                                Meeting is locked
                              </Badge>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => handleJoinMeeting(meeting.id)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all w-full"
                              >
                                <LogIn className="w-4 h-4 mr-1" />
                                Join Meeting
                              </Button>
                            )}
                          </>
                        )}
                        {meeting.status === MeetingStatus.SCHEDULED && (
                          <Badge variant="secondary" className="w-full justify-center">Not started yet</Badge>
                        )}
                        {meeting.status === MeetingStatus.ENDED && (
                          <Badge variant="secondary" className="w-full justify-center">Meeting ended</Badge>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Create Meeting Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Create New Public Meeting
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Create a public meeting that anyone can join
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleCreateMeeting}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* LEFT COLUMN - Basic Information */}
              <div className="space-y-5">
                {/* Title Field */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Study Group Session"
                    required
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Meeting description..."
                    rows={3}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Scheduled Time Field */}
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at" className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-500" />
                    Scheduled Time
                  </Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {/* Max Participants Field */}
                <div className="space-y-2">
                  <Label htmlFor="max_participants" className="text-sm font-semibold flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-orange-500" />
                    Max Participants
                  </Label>
                  <div className="relative">
                    <Input
                      id="max_participants"
                      type="number"
                      min="2"
                      max="10"
                      value={formData.max_participants}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        if (value > 10) {
                          setShowMaxParticipantsAlert(true);
                          return;
                        }
                        setFormData({ ...formData, max_participants: value });
                      }}
                      className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 pr-12"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                      Maximum 10 participants allowed
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN - Advanced Settings */}
              <div className="space-y-5">

              {/* Language Field */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Languages className="w-4 h-4 text-pink-500" />
                  Languages
                </Label>
                
                {/* Selected Languages (Tags) */}
                {selectedLanguages.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    {selectedLanguages.map((lang) => (
                      <Badge 
                        key={lang} 
                        variant="secondary" 
                        className="flex items-center gap-1 px-3 py-1 text-sm"
                      >
                        {lang}
                        <button
                          type="button"
                          onClick={() => removeLanguage(lang)}
                          className="ml-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Predefined Language Buttons */}
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_LANGUAGES.map((lang) => (
                    <Button
                      key={lang.value}
                      type="button"
                      size="sm"
                      variant={selectedLanguages.includes(lang.value) ? "default" : "outline"}
                      onClick={() => toggleLanguage(lang.value)}
                      className="h-9"
                    >
                      <span className="mr-1">{lang.flag}</span>
                      {lang.label}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant={showCustomLanguage ? "default" : "outline"}
                    onClick={() => setShowCustomLanguage(!showCustomLanguage)}
                    className="h-9"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Other
                  </Button>
                </div>

                {/* Custom Language Input */}
                {showCustomLanguage && (
                  <div className="flex gap-2">
                    <Input
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      placeholder="Enter language name"
                      className="h-9"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomLanguage();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addCustomLanguage}
                      disabled={!customLanguage.trim()}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>

              {/* Level Field */}
              <div className="space-y-2">
                <Label htmlFor="level" className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-yellow-500" />
                  Level
                </Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => setFormData({ ...formData, level: value as MeetingLevel })}
                >
                  <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value={MeetingLevel.BEGINNER}>Beginner</SelectItem>
                    <SelectItem value={MeetingLevel.INTERMEDIATE}>Intermediate</SelectItem>
                    <SelectItem value={MeetingLevel.ADVANCED}>Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Topic Field */}
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-500" />
                  Topic
                </Label>
                <Input
                  id="topic"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="e.g., Daily Conversation, Travel English"
                  className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Microphone Settings */}
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-indigo-500" />
                    <Label htmlFor="allow_microphone" className="text-sm font-semibold cursor-pointer">
                      Allow Microphone
                    </Label>
                  </div>
                  <Switch
                    id="allow_microphone"
                    checked={formData.allow_microphone}
                    onCheckedChange={(checked) => setFormData({ ...formData, allow_microphone: checked })}
                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MicOff className="w-4 h-4 text-red-500" />
                    <Label htmlFor="participants_can_unmute" className="text-sm font-semibold cursor-pointer">
                      Participants Can Unmute
                    </Label>
                  </div>
                  <Switch
                    id="participants_can_unmute"
                    checked={formData.participants_can_unmute}
                    onCheckedChange={(checked) => setFormData({ ...formData, participants_can_unmute: checked })}
                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                  />
                </div>
              </div>
              </div>
            </div>
            <DialogFooter className="gap-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateDialog(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Meeting
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* SỬA LỖI: Thêm Dialog xác nhận xóa */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the meeting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog for Max Participants */}
      <AlertDialog open={showMaxParticipantsAlert} onOpenChange={setShowMaxParticipantsAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Giới hạn số người tham gia</AlertDialogTitle>
            <AlertDialogDescription>
              Hệ thống chỉ cho phép tạo phòng tối đa là 10 người
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowMaxParticipantsAlert(false)}>
              Đã hiểu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
// SỬA LỖI: Xóa dấu } thừa