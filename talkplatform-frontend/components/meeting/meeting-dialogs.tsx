"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface MeetingDialogsProps {
  // Leave dialog
  confirmLeaveOpen: boolean;
  setConfirmLeaveOpen: (open: boolean) => void;
  onConfirmLeave: () => void;
  
  // Kick dialog
  confirmKickOpen: boolean;
  setConfirmKickOpen: (open: boolean) => void;
  targetParticipant: { id: string; name: string } | null;
  onConfirmKick: () => void;
  setTargetParticipant: (participant: { id: string; name: string } | null) => void;
  
  // Block dialog
  confirmBlockOpen: boolean;
  setConfirmBlockOpen: (open: boolean) => void;
  onConfirmBlock: () => void;
  
  // Room full dialog
  showRoomFullDialog: boolean;
  setShowRoomFullDialog: (open: boolean) => void;
  onlineParticipantsCount: number;
  maxParticipants: number;
  isPublicMeeting?: boolean;
  
  // Blocked user dialog
  blockedModalOpen: boolean;
  blockedMessage: string;
  setBlockedModalOpen: (open: boolean) => void;
}

/**
 * Shared dialogs component for meeting room
 * Used by both Traditional Meeting and LiveKit Meeting
 */
export function MeetingDialogs({
  confirmLeaveOpen,
  setConfirmLeaveOpen,
  onConfirmLeave,
  confirmKickOpen,
  setConfirmKickOpen,
  targetParticipant,
  onConfirmKick,
  setTargetParticipant,
  confirmBlockOpen,
  setConfirmBlockOpen,
  onConfirmBlock,
  showRoomFullDialog,
  setShowRoomFullDialog,
  onlineParticipantsCount,
  maxParticipants,
  isPublicMeeting = true,
  blockedModalOpen,
  blockedMessage,
  setBlockedModalOpen,
}: MeetingDialogsProps) {
  const router = useRouter();

  return (
    <>
      {/* Leave Dialog */}
      <Dialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave meeting?</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this meeting now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeaveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onConfirmLeave}>Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kick Dialog */}
      <Dialog open={confirmKickOpen} onOpenChange={setConfirmKickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kick participant?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{targetParticipant?.name}</strong> from this meeting? They will be able to rejoin later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmKickOpen(false); setTargetParticipant(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={onConfirmKick}>Kick</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block participant?</DialogTitle>
            <DialogDescription>
              Are you sure you want to block <strong>{targetParticipant?.name}</strong>? They will be removed and cannot rejoin this meeting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmBlockOpen(false); setTargetParticipant(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={onConfirmBlock}>Block</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Full Dialog */}
      <AlertDialog open={showRoomFullDialog} onOpenChange={setShowRoomFullDialog}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex flex-col items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-center">
                <AlertDialogTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Phòng đã đầy
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base text-gray-600 dark:text-gray-300">
                  Phòng này đã đạt số lượng người tham gia tối đa
                </AlertDialogDescription>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {onlineParticipantsCount} / {maxParticipants} người
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Vui lòng thử lại sau hoặc tham gia phòng khác
              </p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center mt-4">
            <AlertDialogAction
              onClick={() => {
                setShowRoomFullDialog(false);
                router.push(isPublicMeeting ? "/meetings" : "/dashboard");
              }}
              className="w-full sm:w-auto !bg-blue-600 hover:!bg-blue-700 !text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay về danh sách phòng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blocked User Modal */}
      <Dialog open={blockedModalOpen} onOpenChange={() => {}} modal={true}>
        <DialogContent 
          className="max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-red-600 text-xl font-bold">Access Denied</DialogTitle>
            <DialogDescription className="text-gray-700 whitespace-pre-line mt-2">
              {blockedMessage || 'You have been blocked from this meeting and cannot join.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button 
              onClick={() => {
                setBlockedModalOpen(false);
                window.location.href = '/dashboard';
              }} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Back to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

