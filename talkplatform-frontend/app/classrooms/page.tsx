"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/store/user-store";
import { getClassroomsApi, createClassroomApi, IClassroom } from "@/api/classrooms.rest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Users, Calendar, Loader2, RefreshCw, Search, Filter } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";

export default function ClassroomsPage() {
  const router = useRouter();
  const { userInfo: user } = useUser();
  const { toast } = useToast();

  const [classrooms, setClassrooms] = useState<IClassroom[]>([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState<IClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showMyClassroomsOnly, setShowMyClassroomsOnly] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  // Filter classrooms based on search and filters
  useEffect(() => {
    if (!classrooms) {
      setFilteredClassrooms([]);
      return;
    }

    let filtered = [...classrooms];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (classroom) =>
          classroom.name.toLowerCase().includes(query) ||
          classroom.description?.toLowerCase().includes(query) ||
          classroom.teacher.username.toLowerCase().includes(query)
      );
    }

    // Active only filter
    if (showActiveOnly) {
      filtered = filtered.filter((classroom) => classroom.is_active);
    }

    // My classrooms only filter (for teachers)
    if (showMyClassroomsOnly && user) {
      filtered = filtered.filter((classroom) => classroom.teacher.id === user.id);
    }

    setFilteredClassrooms(filtered);
  }, [classrooms, searchQuery, showActiveOnly, showMyClassroomsOnly, user]);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const data = await getClassroomsApi();
      setClassrooms(data.data);
    } catch (error: any) {
      console.error('Failed to fetch classrooms:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load classrooms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchClassrooms();
  }, [user]);

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🎓 Creating classroom...', formData);
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Classroom name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const result = await createClassroomApi({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      console.log('✅ Classroom created:', result);

      toast({
        title: "Success",
        description: "Classroom created successfully!",
      });

      setFormData({ name: "", description: "" });
      setCreateDialogOpen(false);
      fetchClassrooms();
    } catch (error: any) {
      console.error('❌ Failed to create classroom:', error);
      console.error('Error details:', error.response?.data);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create classroom",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-8 w-8" />
              Classrooms
            </h1>
            <p className="text-muted-foreground mt-1">
              {isTeacher ? 'Manage your classrooms and schedule meetings' : 'Your enrolled classrooms'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchClassrooms} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

          {isTeacher && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Classroom
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Classroom</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateClassroom} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Classroom Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., English Advanced Level"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your classroom..."
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Create
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search classrooms by name, teacher, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button
            variant={showActiveOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowActiveOnly(!showActiveOnly)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Active Only
          </Button>

          {isTeacher && (
            <Button
              variant={showMyClassroomsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowMyClassroomsOnly(!showMyClassroomsOnly)}
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              My Classrooms
            </Button>
          )}

          {(searchQuery || !showActiveOnly || showMyClassroomsOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setShowActiveOnly(true);
                setShowMyClassroomsOnly(false);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Stats */}
        {!loading && classrooms && classrooms.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <span>Total: {classrooms.length}</span>
            <span>•</span>
            <span>Showing: {filteredClassrooms?.length || 0}</span>
          </div>
        )}
      </div>

      {/* Classrooms Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !filteredClassrooms || filteredClassrooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No classrooms yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              {isTeacher
                ? 'Create your first classroom to get started!'
                : 'You are not enrolled in any classrooms yet.'}
            </p>
            {isTeacher && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Classroom
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClassrooms.map((classroom) => (
            <Card
              key={classroom.id}
              className="hover:shadow-lg transition-all cursor-pointer"
              onClick={() => router.push(`/classrooms/${classroom.id}/meetings`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {classroom.name}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {classroom.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Teacher: {classroom.teacher.username}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{classroom.members?.length || 0} members</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Created {formatDistanceToNow(new Date(classroom.created_at))} ago</span>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline">
                  View Meetings
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
