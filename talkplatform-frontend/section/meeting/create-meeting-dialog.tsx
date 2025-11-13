"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, FileText, Users, Calendar, Youtube, Settings, Video, Lock, MessageSquare, Monitor, Heart, MicOff, Loader2 } from "lucide-react";
import { createMeetingApi, ICreateMeeting } from "@/api/meeting.rest";
import { useToast } from "@/components/ui/use-toast";

interface CreateMeetingDialogProps {
  classroomId: string;
  onSuccess: () => void;
}

export function CreateMeetingDialog({ classroomId, onSuccess }: CreateMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMaxParticipantsAlert, setShowMaxParticipantsAlert] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState<ICreateMeeting>({
    title: "",
    description: "",
    is_private: false,
    max_participants: 10,
    settings: {
      allow_screen_share: true,
      allow_chat: true,
      allow_reactions: true,
      mute_on_join: false,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tiêu đề meeting",
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
      setLoading(true);
      await createMeetingApi(classroomId, formData);
      toast({
        title: "Thành công",
        description: "Tạo meeting thành công!",
      });
      setOpen(false);
      setFormData({
        title: "",
        description: "",
        is_private: false,
        max_participants: 10,
        settings: {
          allow_screen_share: true,
          allow_chat: true,
          allow_reactions: true,
          mute_on_join: false,
        },
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to create meeting:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo meeting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tạo Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Tạo Meeting Mới
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Tạo meeting để học sinh có thể tham gia học trực tuyến
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Tiêu đề <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ví dụ: Buổi học Chapter 5"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" />
                Mô tả
              </Label>
              <Textarea
                id="description"
                placeholder="Mô tả nội dung meeting..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Max Participants Field */}
            <div className="space-y-2">
              <Label htmlFor="max_participants" className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-500" />
                Số người tối đa
              </Label>
              <div className="relative">
                <Input
                  id="max_participants"
                  type="number"
                  min={2}
                  max={10}
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
                  Tối đa 10 người tham gia
                </p>
              </div>
            </div>

            {/* YouTube Video ID Field */}
            <div className="space-y-2">
              <Label htmlFor="youtube_video_id" className="text-sm font-semibold flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-500" />
                YouTube Video ID <span className="text-gray-400 text-xs">(tùy chọn)</span>
              </Label>
              <Input
                id="youtube_video_id"
                placeholder="dQw4w9WgXcQ"
                value={formData.youtube_video_id || ""}
                onChange={(e) => setFormData({ ...formData, youtube_video_id: e.target.value })}
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 px-1">
                ID video từ URL: youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>
              </p>
            </div>

            {/* Settings Section */}
            <div className="space-y-4 border-t pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-lg">Cài đặt Meeting</h4>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Label htmlFor="is_private" className="cursor-pointer flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span>Meeting riêng tư</span>
                  </Label>
                  <Switch
                    id="is_private"
                    checked={formData.is_private}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_private: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Label htmlFor="allow_chat" className="cursor-pointer flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span>Cho phép chat</span>
                  </Label>
                  <Switch
                    id="allow_chat"
                    checked={formData.settings?.allow_chat}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        settings: { ...formData.settings, allow_chat: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Label htmlFor="allow_screen_share" className="cursor-pointer flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-green-500" />
                    <span>Cho phép chia sẻ màn hình</span>
                  </Label>
                  <Switch
                    id="allow_screen_share"
                    checked={formData.settings?.allow_screen_share}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        settings: { ...formData.settings, allow_screen_share: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Label htmlFor="allow_reactions" className="cursor-pointer flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span>Cho phép reactions</span>
                  </Label>
                  <Switch
                    id="allow_reactions"
                    checked={formData.settings?.allow_reactions}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        settings: { ...formData.settings, allow_reactions: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Label htmlFor="mute_on_join" className="cursor-pointer flex items-center gap-2">
                    <MicOff className="w-4 h-4 text-orange-500" />
                    <span>Tắt mic khi vào</span>
                  </Label>
                  <Switch
                    id="mute_on_join"
                    checked={formData.settings?.mute_on_join}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        settings: { ...formData.settings, mute_on_join: checked },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="px-6"
            >
              Hủy
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

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
    </Dialog>
  );
}

