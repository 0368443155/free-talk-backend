"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
    Calendar,
    Clock,
    Video,
    Lock,
    Loader2,
    FileText,
    Download,
    Eye,
} from 'lucide-react';
import { Lesson, LessonMaterial } from '@/api/courses.rest';
import { checkLessonAccessApi, joinLessonMeetingApi, getLessonMaterialsApi, downloadMaterialApi } from '@/api/courses.rest';
import { useUser } from '@/store/user-store';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LessonCardProps {
    lesson: Lesson;
    courseId: string;
    sessionId: string;
    hasSessionAccess: boolean;
    onAccessChange?: () => void;
}

export function LessonCard({ lesson, courseId, sessionId, hasSessionAccess, onAccessChange }: LessonCardProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { userInfo } = useUser();
    const [lessonAccess, setLessonAccess] = useState<{ hasAccess: boolean; reason?: string; requiresPurchase?: boolean } | null>(null);
    const [checkingAccess, setCheckingAccess] = useState(false);
    const [joining, setJoining] = useState(false);
    const [materials, setMaterials] = useState<LessonMaterial[]>([]);
    const [loadingMaterials, setLoadingMaterials] = useState(false);
    const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

    useEffect(() => {
        checkAccess();
    }, [lesson.id, hasSessionAccess]);

    const checkAccess = async () => {
        try {
            setCheckingAccess(true);
            const access = await checkLessonAccessApi(courseId, sessionId, lesson.id);
            setLessonAccess(access);
            
            // Load materials if has access
            if (access.hasAccess) {
                loadMaterials();
            }
        } catch (error: any) {
            console.error('Error checking access:', error);
            setLessonAccess({ hasAccess: false, reason: 'Error checking access' });
        } finally {
            setCheckingAccess(false);
        }
    };

    const loadMaterials = async () => {
        try {
            setLoadingMaterials(true);
            const data = await getLessonMaterialsApi(lesson.id);
            setMaterials(data);
        } catch (error: any) {
            console.error('Error loading materials:', error);
            toast({
                title: "Error",
                description: "Failed to load lesson materials",
                variant: "destructive",
            });
        } finally {
            setLoadingMaterials(false);
        }
    };

    const handleJoinMeeting = async () => {
        if (!lessonAccess?.hasAccess) {
            setShowPurchaseDialog(true);
            return;
        }

        try {
            setJoining(true);
            // Validate access and time - this does NOT create participant
            await joinLessonMeetingApi(courseId, sessionId, lesson.id);
            
            // Navigate to meeting room - frontend will show join options
            if (lesson.meeting_id) {
                router.push(`/meetings/${lesson.meeting_id}`);
            } else {
                toast({
                    title: "Error",
                    description: "Meeting room not available",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            toast({
                title: "Cannot Join",
                description: error.response?.data?.message || "You cannot join this lesson at this time",
                variant: "destructive",
            });
        } finally {
            setJoining(false);
        }
    };

    const handleDownloadMaterial = async (material: LessonMaterial) => {
        try {
            const result = await downloadMaterialApi(material.id);
            if (result.downloadUrl) {
                window.open(result.downloadUrl, '_blank');
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to download material",
                variant: "destructive",
            });
        }
    };

    const canAccess = lesson.is_preview || lesson.is_free || lessonAccess?.hasAccess || hasSessionAccess;
    const isPast = new Date(`${lesson.scheduled_date}T${lesson.end_time}`) < new Date();
    const isUpcoming = new Date(`${lesson.scheduled_date}T${lesson.start_time}`) > new Date();
    const isOngoing = !isPast && !isUpcoming;

    // Calculate if can join (15 minutes before start)
    const scheduledTime = new Date(`${lesson.scheduled_date}T${lesson.start_time}`);
    const joinStartTime = new Date(scheduledTime.getTime() - 15 * 60 * 1000);
    const canJoin = new Date() >= joinStartTime && !isPast;

    return (
        <>
            <Card className={!canAccess ? 'opacity-75' : ''}>
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">
                                    Lesson {lesson.lesson_number}
                                </Badge>
                                {lesson.is_preview && (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                        Preview
                                    </Badge>
                                )}
                                {lesson.is_free && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        Free
                                    </Badge>
                                )}
                                {!canAccess && (
                                    <Badge variant="destructive">
                                        <Lock className="w-3 h-3 mr-1" />
                                        Locked
                                    </Badge>
                                )}
                                {isPast && (
                                    <Badge variant="outline" className="bg-gray-100">
                                        Completed
                                    </Badge>
                                )}
                                {isOngoing && (
                                    <Badge variant="default" className="bg-green-600">
                                        Live Now
                                    </Badge>
                                )}
                            </div>

                            <h4 className="font-semibold text-base mb-1">{lesson.title}</h4>
                            
                            {lesson.description && (
                                <p className="text-sm text-gray-600 mb-3">{lesson.description}</p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(lesson.scheduled_date).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {lesson.start_time} - {lesson.end_time}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Video className="w-3 h-3" />
                                    {lesson.duration_minutes} min
                                </div>
                            </div>

                            {/* Materials */}
                            {canAccess && materials.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-xs font-medium text-gray-700">Materials:</p>
                                    <div className="space-y-1">
                                        {materials.map((material) => (
                                            <div
                                                key={material.id}
                                                className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-3 h-3 text-gray-500" />
                                                    <span>{material.title}</span>
                                                    {material.is_required && (
                                                        <Badge variant="outline" className="text-xs">
                                                            Required
                                                        </Badge>
                                                    )}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 px-2"
                                                    onClick={() => handleDownloadMaterial(material)}
                                                >
                                                    <Download className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {canAccess && loadingMaterials && (
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Loading materials...
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            {canAccess ? (
                                <>
                                    {lesson.meeting_id && (
                                        <Button
                                            size="sm"
                                            onClick={handleJoinMeeting}
                                            disabled={joining || !canJoin}
                                            variant={isOngoing ? "default" : "outline"}
                                        >
                                            {joining ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                    Joining...
                                                </>
                                            ) : isPast ? (
                                                <>
                                                    <Eye className="w-3 h-3 mr-1" />
                                                    View Recording
                                                </>
                                            ) : !canJoin ? (
                                                <>
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Starts Soon
                                                </>
                                            ) : (
                                                <>
                                                    <Video className="w-3 h-3 mr-1" />
                                                    Join Meeting
                                                </>
                                            )}
                                        </Button>
                                    )}
                                    {!canJoin && !isPast && (
                                        <p className="text-xs text-gray-500 text-center">
                                            Join 15 min before start
                                        </p>
                                    )}
                                </>
                            ) : (
                                <div className="text-center">
                                    <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-xs text-gray-500 mb-2">
                                        Purchase required
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Purchase Required</AlertDialogTitle>
                        <AlertDialogDescription>
                            You need to purchase this course or session to access this lesson.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.push(`/courses/${courseId}`)}>
                            View Course
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

