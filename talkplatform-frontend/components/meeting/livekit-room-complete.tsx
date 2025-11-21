"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLiveKit, LiveKitParticipant } from '@/hooks/use-livekit';
import { WaitingRoomHostPanel } from './waiting-room-host-panel';
import { GreenRoom, DeviceSettings } from './green-room';
import { MeetingControls } from './meeting-controls';
import { useReactions } from './reaction-overlay';
import { MeetingChat } from '../../section/meetings/meeting-chat';
import { LiveKitBandwidthMonitor } from './livekit-bandwidth-monitor';
import { YouTubePlayer, YouTubePlayerHandle } from '../../section/meetings/youtube-player';
import { YouTubeSearchModal } from '../youtube-search-modal';
import { IMeetingChatMessage, MessageType, ParticipantRole } from '@/api/meeting.rest';
import { generateLiveKitTokenApi } from '@/api/livekit.rest';
import {
  VideoOff,
  MicOff,
  MessageSquare,
  X,
  Play,
  Users,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  Crown,
  Shield,
  UserX,
  Smile,
  Send,
  Loader2,
  Pause,
  MonitorUp,
  Video as VideoIcon,
  Mic,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';

interface LiveKitRoomWrapperProps {
  meetingId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  onLeave: () => void;
  isHost?: boolean;
}
