"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Star, 
  Clock, 
  Users, 
  DollarSign, 
  MapPin, 
  GraduationCap,
  Award,
  MessageCircle,
  Calendar,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { getTeacherByIdApi } from '@/api/teachers.rest';
import { useToast } from '@/components/ui/use-toast';

export default function TeacherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const teacherId = params.id as string;

  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teacherId) {
      loadTeacherProfile();
    }
  }, [teacherId]);

  const loadTeacherProfile = async () => {
    setLoading(true);
    try {
      const response = await getTeacherByIdApi(teacherId);
      setTeacher(response);
    } catch (error: any) {
      console.error('Failed to load teacher profile:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to load teacher profile",
        variant: "destructive",
      });
      router.push('/teachers');
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = (username: string) => {
    return username
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Teacher not found</p>
            <Button onClick={() => router.push('/teachers')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Teachers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => router.push('/teachers')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Teachers
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Teacher Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={teacher.avatar_url} alt={teacher.username} />
                  <AvatarFallback className="text-2xl">
                    {getUserInitials(teacher.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{teacher.username}</h2>
                  {teacher.is_verified && (
                    <Badge className="mt-2 bg-blue-500">
                      <Award className="w-3 h-3 mr-1" />
                      Verified Teacher
                    </Badge>
                  )}
                </div>
                <Separator />
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span>Rating</span>
                    </div>
                    <span className="font-semibold">{teacher.average_rating?.toFixed(1) || '0.0'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Students</span>
                    </div>
                    <span className="font-semibold">{teacher.total_students ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Hours Taught</span>
                    </div>
                    <span className="font-semibold">{teacher.total_hours_taught ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>Rate</span>
                    </div>
                    <span className="font-semibold">
                      {teacher.hourly_rate_credits || teacher.hourly_rate || 0} credits/hour
                    </span>
                  </div>
                  {teacher.country && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>Location</span>
                      </div>
                      <span className="font-semibold">{teacher.country}</span>
                    </div>
                  )}
                </div>
                <Separator />
                <Button 
                  className="w-full" 
                  onClick={() => router.push(`/teachers/${teacherId}/book`)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book a Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Headline */}
          {teacher.headline && (
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">{teacher.headline}</p>
              </CardContent>
            </Card>
          )}

          {/* Bio */}
          {teacher.bio && (
            <Card>
              <CardHeader>
                <CardTitle>Biography</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">{teacher.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Languages & Specialties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teacher.languages_taught && teacher.languages_taught.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Languages Taught
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {teacher.languages_taught.map((lang: string, index: number) => (
                      <Badge key={index} variant="secondary">{lang}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {teacher.specialties && teacher.specialties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Specialties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {teacher.specialties.map((specialty: string, index: number) => (
                      <Badge key={index} variant="outline">{specialty}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Experience */}
          {teacher.years_experience && teacher.years_experience > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {teacher.years_experience} {teacher.years_experience === 1 ? 'year' : 'years'} of teaching experience
                </p>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          {teacher.total_reviews && Number(teacher.total_reviews) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
                <CardDescription>
                  {teacher.total_reviews} {teacher.total_reviews === 1 ? 'review' : 'reviews'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Reviews will be displayed here</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

