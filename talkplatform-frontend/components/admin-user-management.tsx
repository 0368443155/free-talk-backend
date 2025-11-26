"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Users, UserPlus, Edit, Trash2, Search, Shield, UserCheck, UserX, Coins, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { 
  adminListUsersApi, 
  adminUpdateUserRoleApi, 
  adminUpdateUserApi,
  adminDeleteUserApi,
  adminCreateUserApi,
  adminAdjustCreditsApi,
  adminRevokeTeacherStatusApi,
  IUser,
  UserRole,
  IUserListResponse
} from '@/api/admin.rest';

interface UserWithStats extends IUser {
  isActive?: boolean; // Derived from role or other logic
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [creditTargetId, setCreditTargetId] = useState<string | null>(null);
  const [creditAction, setCreditAction] = useState<'delta' | 'setTo'>('delta');
  const [creditValue, setCreditValue] = useState<string>('');
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'student' as UserRole });
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const { toast } = useToast();

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      
      if (roleFilter !== 'all') {
        params.role = roleFilter.toLowerCase();
      }
      
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      const response: IUserListResponse = await adminListUsersApi(params);
      setUsers(response.data.map(user => ({ ...user, isActive: true }))); // All users are active by default
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, roleFilter, searchTerm, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchUsers();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [roleFilter]);

  // Calculate stats
  const stats = {
    total: pagination.total,
    admins: users.filter(u => u.role === 'admin').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    students: users.filter(u => u.role === 'student').length,
    active: users.length, // All users are active
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'teacher': return 'default';
      case 'student': return 'secondary';
      default: return 'outline';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle role change
  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      await adminUpdateUserRoleApi(userId, newRole);
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!deleteTargetId) return;
    
    try {
      await adminDeleteUserApi(deleteTargetId);
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeleteTargetId(null);
      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  // Handle user edit
  const handleEditUser = (user: UserWithStats) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    try {
      await adminUpdateUserApi(selectedUser.id, {
        username: selectedUser.username,
        email: selectedUser.email,
      });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  // Handle create user
  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await adminCreateUserApi(newUser);
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setIsCreateDialogOpen(false);
      setNewUser({ username: '', email: '', password: '', role: 'student' });
      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  // Handle credit adjustment
  const handleAdjustCredits = async () => {
    if (!creditTargetId || !creditValue) return;

    try {
      const payload = creditAction === 'delta' 
        ? { delta: parseInt(creditValue) }
        : { setTo: parseInt(creditValue) };
      
      await adminAdjustCreditsApi(creditTargetId, payload);
      toast({
        title: "Success",
        description: "User credits updated successfully",
      });
      setIsCreditDialogOpen(false);
      setCreditTargetId(null);
      setCreditValue('');
      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to adjust credits",
        variant: "destructive",
      });
    }
  };

  const handleRevokeTeacher = async () => {
    if (!revokeTargetId) return;

    try {
      await adminRevokeTeacherStatusApi(revokeTargetId, revokeReason || undefined);
      toast({
        title: "Success",
        description: "Teacher status revoked successfully",
      });
      setIsRevokeDialogOpen(false);
      setRevokeTargetId(null);
      setRevokeReason('');
      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to revoke teacher status",
        variant: "destructive",
      });
    }
  };

  if (loading && users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-muted-foreground">Manage system users, roles, and permissions</p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{stats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Teachers</p>
                <p className="text-2xl font-bold">{stats.teachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Students</p>
                <p className="text-2xl font-bold">{stats.students}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value: UserRole) => handleUpdateRole(user.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.credit_balance}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCreditTargetId(user.id);
                              setCreditValue('');
                              setIsCreditDialogOpen(true);
                            }}
                          >
                            <Coins className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {user.role === 'teacher' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-orange-600 border-orange-200 hover:bg-orange-50"
                              onClick={() => {
                                setRevokeTargetId(user.id);
                                setRevokeReason('');
                                setIsRevokeDialogOpen(true);
                              }}
                            >
                              <UserX className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setDeleteTargetId(user.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Username</Label>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Username</Label>
                <Input
                  value={selectedUser.username}
                  onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value: UserRole) => setSelectedUser({ ...selectedUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Credit Balance</Label>
                <Input
                  type="number"
                  value={selectedUser.credit_balance}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTargetId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Teacher Status Dialog */}
      <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Teacher Status</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the teacher status and demote the user to student role. The teacher profile will be marked as suspended.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Reason (Optional)</Label>
              <Textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Enter reason for revoking teacher status..."
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRevokeTargetId(null);
              setRevokeReason('');
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeTeacher} className="bg-orange-600 hover:bg-orange-700">
              Revoke Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credit Adjustment Dialog */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust User Credits</DialogTitle>
            <DialogDescription>
              Add or subtract credits, or set a specific amount
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Action</Label>
              <Select
                value={creditAction}
                onValueChange={(value: 'delta' | 'setTo') => setCreditAction(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delta">Add/Subtract Credits</SelectItem>
                  <SelectItem value="setTo">Set Credits To</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{creditAction === 'delta' ? 'Amount to Add/Subtract' : 'Credit Amount'}</Label>
              <Input
                type="number"
                value={creditValue}
                onChange={(e) => setCreditValue(e.target.value)}
                placeholder={creditAction === 'delta' ? 'e.g., +100 or -50' : 'e.g., 1000'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreditDialogOpen(false);
              setCreditTargetId(null);
              setCreditValue('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleAdjustCredits}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
