"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Users, 
  DollarSign, 
  MapPin, 
  Loader2,
  GraduationCap,
  Award,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getTeachersApi, GetTeachersQuery } from '@/api/teachers.rest';

// Mock teacher data - fallback if API fails
const mockTeachers = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: '/avatars/teacher1.jpg',
    rating: 4.9,
    totalReviews: 127,
    hourlyRate: 15,
    languages: ['English', 'Spanish'],
    specialties: ['Conversation', 'Business'],
    experience: 5,
    totalStudents: 234,
    responseTime: '2 hours',
    isVerified: true,
    isOnline: true,
    nextAvailable: 'Today at 2:00 PM',
    introduction: 'Experienced English teacher with a passion for conversation practice.',
    country: 'United States'
  },
  {
    id: '2', 
    name: 'Miguel Rodriguez',
    avatar: '/avatars/teacher2.jpg',
    rating: 4.8,
    totalReviews: 89,
    hourlyRate: 12,
    languages: ['Spanish', 'English'],
    specialties: ['Grammar', 'Pronunciation'],
    experience: 3,
    totalStudents: 156,
    responseTime: '1 hour',
    isVerified: true,
    isOnline: false,
    nextAvailable: 'Tomorrow at 10:00 AM',
    introduction: 'Native Spanish speaker helping students master pronunciation.',
    country: 'Mexico'
  },
  {
    id: '3',
    name: 'Emma Chen',
    avatar: '/avatars/teacher3.jpg',
    rating: 4.9,
    totalReviews: 203,
    hourlyRate: 20,
    languages: ['Mandarin', 'English'],
    specialties: ['Business', 'Academic'],
    experience: 8,
    totalStudents: 445,
    responseTime: '30 minutes',
    isVerified: true,
    isOnline: true,
    nextAvailable: 'Available now',
    introduction: 'Professional Mandarin instructor with business background.',
    country: 'China'
  }
];

export default function TeachersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    language: '',
    specialty: '',
    minRating: '',
    maxPrice: '',
    availability: '',
    experience: ''
  });

  // Map backend data to frontend format
  const mapTeacherData = (teacher: any) => {
    return {
      id: teacher.id || teacher.user_id,
      name: teacher.username || teacher.name || 'Unknown Teacher',
      avatar: teacher.avatar_url || teacher.avatar || '/avatars/default.jpg',
      rating: teacher.average_rating || teacher.rating || 0,
      totalReviews: teacher.total_reviews || teacher.totalReviews || 0,
      hourlyRate: teacher.hourly_rate_credits || teacher.hourly_rate || teacher.hourlyRate || 0,
      languages: teacher.languages_taught || teacher.languages || [],
      specialties: teacher.specialties || [],
      experience: teacher.years_experience || teacher.experience || 0,
      totalStudents: teacher.total_students || teacher.totalStudents || 0,
      responseTime: teacher.avg_response_time_hours 
        ? `${teacher.avg_response_time_hours} hours` 
        : teacher.responseTime || 'N/A',
      isVerified: teacher.is_verified || teacher.isVerified || false,
      isOnline: teacher.is_available || teacher.isOnline || false,
      nextAvailable: teacher.is_available ? 'Available now' : 'Check availability',
      introduction: teacher.headline || teacher.bio || teacher.introduction || 'No introduction available',
      country: teacher.country || 'Unknown'
    };
  };

  // Load teachers from API
  const loadTeachers = async () => {
    setLoading(true);
    try {
      const query: GetTeachersQuery = {
        page: 1,
        limit: 50,
        isVerified: 'true', // Only show verified teachers by default
      };

      if (searchQuery) {
        query.search = searchQuery;
      }

      if (filters.minRating) {
        query.minRating = parseFloat(filters.minRating);
      }

      if (filters.maxPrice) {
        query.maxRate = parseFloat(filters.maxPrice);
      }

      const response = await getTeachersApi(query);
      const mappedTeachers = response.data.map(mapTeacherData);
      setTeachers(mappedTeachers);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      toast({
        title: "Error",
        description: "Failed to load teachers. Showing mock data.",
        variant: "destructive",
      });
      // Fallback to mock data
      setTeachers(mockTeachers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Get initial filters from URL params
    const language = searchParams.get('language') || '';
    const specialty = searchParams.get('specialty') || '';
    
    setFilters(prev => ({
      ...prev,
      language,
      specialty
    }));

    // Load teachers on mount
    loadTeachers();
  }, [searchParams]);

  const handleSearch = async () => {
    await loadTeachers();
    
    // Apply client-side filters for language, specialty, availability
    // (These might not be supported by backend API yet)
    let filtered = teachers.filter(teacher => {
      const matchesLanguage = !filters.language || 
        teacher.languages.some((lang: string) => 
          lang.toLowerCase().includes(filters.language.toLowerCase())
        );
      const matchesSpecialty = !filters.specialty || 
        teacher.specialties.some((s: string) => 
          s.toLowerCase().includes(filters.specialty.toLowerCase())
        );
      const matchesAvailability = !filters.availability || 
        (filters.availability === 'online' && teacher.isOnline) ||
        (filters.availability === 'available' && teacher.nextAvailable.includes('now'));
      
      return matchesLanguage && matchesSpecialty && matchesAvailability;
    });

    setTeachers(filtered);
    
    toast({
      title: "Search completed",
      description: `Found ${filtered.length} teachers matching your criteria`,
    });
  };

  const bookTeacher = (teacherId: string) => {
    router.push(`/teachers/${teacherId}/book`);
  };

  const viewProfile = (teacherId: string) => {
    router.push(`/teachers/${teacherId}`);
  };

  const clearFilters = () => {
    setFilters({
      language: '',
      specialty: '',
      minRating: '',
      maxPrice: '',
      availability: '',
      experience: ''
    });
    setSearchQuery('');
    loadTeachers();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Find Teachers</h1>
              <p className="text-gray-600 mt-1">Connect with qualified language teachers</p>
            </div>
            <Button onClick={() => router.push('/become-teacher')}>
              <GraduationCap className="w-4 h-4 mr-2" />
              Become a Teacher
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, specialties, or introduction..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  Search
                </Button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Select value={filters.language || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, language: value === "all" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="Mandarin">Mandarin</SelectItem>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.specialty || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, specialty: value === "all" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    <SelectItem value="Conversation">Conversation</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Grammar">Grammar</SelectItem>
                    <SelectItem value="Pronunciation">Pronunciation</SelectItem>
                    <SelectItem value="Academic">Academic</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.minRating || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, minRating: value === "all" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Min Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Rating</SelectItem>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                    <SelectItem value="4.0">4.0+ Stars</SelectItem>
                    <SelectItem value="3.5">3.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.maxPrice || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, maxPrice: value === "all" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Max Price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Price</SelectItem>
                    <SelectItem value="10">Under $10/hr</SelectItem>
                    <SelectItem value="15">Under $15/hr</SelectItem>
                    <SelectItem value="20">Under $20/hr</SelectItem>
                    <SelectItem value="30">Under $30/hr</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.availability || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, availability: value === "all" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Time</SelectItem>
                    <SelectItem value="online">Online Now</SelectItem>
                    <SelectItem value="available">Available Now</SelectItem>
                    <SelectItem value="today">Available Today</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters}>
                  <Filter className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {teachers.length} teachers found
            </h2>
            <div className="flex gap-2">
              <Select defaultValue="rating">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="experience">Most Experienced</SelectItem>
                  <SelectItem value="students">Most Students</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teachers.map((teacher) => (
                <Card key={teacher.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Teacher Header */}
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xl font-medium">
                              {teacher.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          </div>
                          {teacher.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                          {teacher.isVerified && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center">
                              <Award className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{teacher.name}</h3>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">{teacher.rating}</span>
                            <span className="text-sm text-gray-500">({teacher.totalReviews})</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {teacher.country}
                          </div>
                        </div>
                      </div>

                      {/* Languages */}
                      <div className="flex flex-wrap gap-1">
                        {teacher.languages.map((lang: string) => (
                          <Badge key={lang} variant="secondary" className="text-xs">
                            {lang}
                          </Badge>
                        ))}
                      </div>

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-1">
                        {teacher.specialties.map((specialty: string) => (
                          <Badge key={specialty} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>

                      {/* Introduction */}
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {teacher.introduction}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span>{teacher.totalStudents} students</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>{teacher.experience}y experience</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                          <span>${teacher.hourlyRate}/hour</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4 text-gray-500" />
                          <span>{teacher.responseTime}</span>
                        </div>
                      </div>

                      {/* Availability */}
                      <div className="text-sm">
                        <span className="text-gray-500">Next available: </span>
                        <span className="font-medium text-green-600">{teacher.nextAvailable}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => viewProfile(teacher.id)}
                          className="flex-1"
                        >
                          View Profile
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => bookTeacher(teacher.id)}
                          className="flex-1"
                        >
                          <Calendar className="w-4 h-4 mr-1" />
                          Book
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {teachers.length === 0 && !loading && (
            <div className="text-center py-12">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teachers found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search criteria</p>
              <Button onClick={clearFilters}>Clear all filters</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}