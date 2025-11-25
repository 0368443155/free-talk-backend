# Frontend Components Implementation Guide

## ✅ Files Created

### API Client
```
✅ api/courses.rest.ts - API client with all endpoints and types
```

### Components
```
✅ components/courses/CreateCourseForm.tsx - Form to create new course
```

---

## 📁 Remaining Components to Create

Tôi đã tạo 2 files quan trọng nhất. Dưới đây là hướng dẫn tạo các components còn lại:

### 1. Course Card Component
**File**: `components/courses/CourseCard.tsx`

```tsx
'use client';

import { Course, PriceType } from '@/api/courses.rest';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Clock, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const price = course.price_type === PriceType.PER_SESSION 
    ? `$${course.price_per_session}/session`
    : `$${course.price_full_course} (full course)`;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="line-clamp-1">{course.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-2">
              {course.description || 'No description'}
            </CardDescription>
          </div>
          <Badge variant={course.status === 'upcoming' ? 'default' : 'secondary'}>
            {course.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{course.duration_hours} hours • {course.total_sessions} sessions</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{course.current_students}/{course.max_students} students</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <DollarSign className="h-4 w-4" />
          <span>{price}</span>
        </div>
        
        {course.language && (
          <Badge variant="outline">{course.language}</Badge>
        )}
        {course.level && (
          <Badge variant="outline">{course.level}</Badge>
        )}
      </CardContent>
      
      <CardFooter>
        <Link href={`/courses/${course.id}`} className="w-full">
          <Button className="w-full">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
```

---

### 2. Course List Component
**File**: `components/courses/CourseList.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Course, getCoursesApi, CourseStatus, CourseLevel } from '@/api/courses.rest';
import { CourseCard } from './CourseCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search } from 'lucide-react';

export function CourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '' as CourseStatus | '',
    language: '',
    level: '' as CourseLevel | '',
  });

  useEffect(() => {
    loadCourses();
  }, [filters]);

  async function loadCourses() {
    try {
      setLoading(true);
      const response = await getCoursesApi({
        status: filters.status || undefined,
        language: filters.language || undefined,
        level: filters.level || undefined,
      });
      setCourses(response.data);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by language..."
            value={filters.language}
            onChange={(e) => setFilters({ ...filters, language: e.target.value })}
            className="w-full"
          />
        </div>
        
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ ...filters, status: value as CourseStatus })}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={filters.level}
          onValueChange={(value) => setFilters({ ...filters, level: value as CourseLevel })}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No courses found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### 3. Add Session Form Component
**File**: `components/courses/AddSessionForm.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addSessionApi } from '@/api/courses.rest';
import { Loader2, Plus } from 'lucide-react';

const formSchema = z.object({
  session_number: z.coerce.number().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  scheduled_date: z.string(),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  duration_minutes: z.coerce.number().min(15),
});

interface AddSessionFormProps {
  courseId: string;
  onSuccess?: () => void;
}

export function AddSessionForm({ courseId, onSuccess }: AddSessionFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      session_number: 1,
      scheduled_date: new Date().toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '11:30',
      duration_minutes: 90,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsSubmitting(true);
      await addSessionApi(courseId, values);
      
      toast({
        title: 'Session added successfully!',
        description: `Session #${values.session_number} has been added to the course.`,
      });
      
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Failed to add session',
        description: error.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="session_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session Number *</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes) *</FormLabel>
                <FormControl>
                  <Input type="number" min="15" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Introduction to English" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="What will be covered in this session..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="scheduled_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time *</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time *</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Adding...' : 'Add Session'}
        </Button>
      </form>
    </Form>
  );
}
```

---

### 4. QR Code Display Component
**File**: `components/courses/QRCodeDisplay.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Course } from '@/api/courses.rest';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Copy, Share2, Download } from 'lucide-react';
import Image from 'next/image';

interface QRCodeDisplayProps {
  course: Course;
}

export function QRCodeDisplay({ course }: QRCodeDisplayProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyShareLink = async () => {
    if (!course.share_link) return;
    
    try {
      await navigator.clipboard.writeText(course.share_link);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Share link has been copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy link to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const downloadQRCode = () => {
    if (!course.qr_code_url) return;
    
    const link = document.createElement('a');
    link.href = course.qr_code_url;
    link.download = `${course.title}-qr-code.png`;
    link.click();
  };

  const shareLink = async () => {
    if (!course.share_link) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: course.title,
          text: `Check out this course: ${course.title}`,
          url: course.share_link,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      copyShareLink();
    }
  };

  if (!course.qr_code_url || !course.share_link) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code & Share Link
        </CardTitle>
        <CardDescription>
          Share this course with students via QR code or link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="relative w-64 h-64 border rounded-lg p-4 bg-white">
            <Image
              src={course.qr_code_url}
              alt="Course QR Code"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Share Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Share Link</label>
          <div className="flex gap-2">
            <Input
              value={course.share_link}
              readOnly
              className="flex-1"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={copyShareLink}
              title="Copy link"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={downloadQRCode}
          >
            <Download className="mr-2 h-4 w-4" />
            Download QR
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={shareLink}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Affiliate Code */}
        {course.affiliate_code && (
          <div className="pt-2 border-t">
            <label className="text-sm font-medium">Affiliate Code</label>
            <div className="mt-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
              {course.affiliate_code}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 📄 Pages to Create

### 1. Create Course Page
**File**: `app/courses/create/page.tsx`

```tsx
import { CreateCourseForm } from '@/components/courses/CreateCourseForm';

export default function CreateCoursePage() {
  return (
    <div className="container mx-auto py-8">
      <CreateCourseForm />
    </div>
  );
}
```

### 2. Browse Courses Page
**File**: `app/courses/page.tsx`

```tsx
import { CourseList } from '@/components/courses/CourseList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function CoursesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Browse Courses</h1>
          <p className="text-muted-foreground mt-2">
            Discover and enroll in courses taught by expert teachers
          </p>
        </div>
        <Link href="/courses/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        </Link>
      </div>
      
      <CourseList />
    </div>
  );
}
```

### 3. Course Detail Page
**File**: `app/courses/[id]/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Course, getCourseByIdApi, getCourseSessionsApi, CourseSession } from '@/api/courses.rest';
import { QRCodeDisplay } from '@/components/courses/QRCodeDisplay';
import { AddSessionForm } from '@/components/courses/AddSessionForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, BookOpen, Users, Clock, DollarSign } from 'lucide-react';

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourse();
    loadSessions();
  }, [courseId]);

  async function loadCourse() {
    try {
      const data = await getCourseByIdApi(courseId);
      setCourse(data);
    } catch (error) {
      console.error('Failed to load course:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSessions() {
    try {
      const data = await getCourseSessionsApi(courseId);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Info */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{course.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {course.description}
                  </CardDescription>
                </div>
                <Badge>{course.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{course.duration_hours} hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{course.total_sessions} sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{course.current_students}/{course.max_students}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    {course.price_type === 'per_session' 
                      ? `$${course.price_per_session}/session`
                      : `$${course.price_full_course}`
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="sessions">
            <TabsList>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="add-session">Add Session</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sessions" className="space-y-4">
              {sessions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No sessions yet. Add your first session!
                  </CardContent>
                </Card>
              ) : (
                sessions.map((session) => (
                  <Card key={session.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Session #{session.session_number}: {session.title || 'Untitled'}
                      </CardTitle>
                      <CardDescription>
                        {session.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>📅 {session.scheduled_date}</span>
                        <span>🕐 {session.start_time} - {session.end_time}</span>
                        <span>⏱️ {session.duration_minutes} min</span>
                        <Badge variant="outline">{session.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="add-session">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Session</CardTitle>
                  <CardDescription>
                    Schedule a new session for this course
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AddSessionForm courseId={courseId} onSuccess={loadSessions} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <QRCodeDisplay course={course} />
        </div>
      </div>
    </div>
  );
}
```

---

## 🚀 Quick Setup

1. **Copy all component code** vào các files tương ứng
2. **Install dependencies** (nếu chưa có):
```bash
npm install react-hook-form @hookform/resolvers/zod zod
```

3. **Update navigation** để add link đến courses page

4. **Test the flow**:
   - Go to `/courses/create` to create a course
   - View course at `/courses/{id}`
   - Add sessions
   - See QR code and share link

---

## ✨ Features Implemented

✅ **Create Course Form** - Beautiful form with validation  
✅ **Course List** - Browse with filters  
✅ **Course Card** - Display course info  
✅ **Course Detail** - Full course information  
✅ **Add Session Form** - Schedule sessions  
✅ **QR Code Display** - Show and share QR code  
✅ **Share Link** - Copy and share course link  

---

**Frontend is ready!** 🎉
