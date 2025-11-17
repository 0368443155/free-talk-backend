"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/store/user-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { AdminBandwidthMonitor } from '@/components/admin-bandwidth-monitor';
import {
  adminAdjustCreditsApi,
  adminGetFeesApi,
  adminListUsersApi,
  adminListTeachersApi,
  adminSetFeesApi,
  adminUpdateUserRoleApi,
  adminVerifyTeacherApi,
  PlatformFees,
  AdminTeacherRow,
  IUser,
} from '@/api/admin.rest';

export default function AdminPage() {
  const router = useRouter();
  const { userInfo: user } = useUser();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.push('/login');
    if (user && user.role !== 'admin') router.push('/dashboard');
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <p className="text-muted-foreground">Manage users, teachers, and platform fees</p>
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="fees">Platform Fees</TabsTrigger>
          <TabsTrigger value="bandwidth">Bandwidth Monitor</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="teachers">
          <TeachersTab />
        </TabsContent>
        <TabsContent value="fees">
          <FeesTab />
        </TabsContent>
        <TabsContent value="bandwidth">
          <AdminBandwidthMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [role, setRole] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminListUsersApi({ page, limit: 10, role: role === 'all' ? undefined as any : (role as any), search: search || undefined });
      setUsers(res.data);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      toast({ title: 'Failed to load users', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, role]);

  const changeRole = async (id: string, newRole: 'student' | 'teacher' | 'admin') => {
    try {
      await adminUpdateUserRoleApi(id, newRole);
      toast({ title: 'Role updated' });
      load();
    } catch (e: any) {
      toast({ title: 'Failed to update role', description: e.message, variant: 'destructive' });
    }
  };

  const changeCredits = async (id: string, delta?: number, setTo?: number) => {
    try {
      await adminAdjustCreditsApi(id, { delta, setTo });
      toast({ title: 'Credits updated' });
      load();
    } catch (e: any) {
      toast({ title: 'Failed to update credits', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Search and manage all users</CardDescription>
        <div className="flex gap-2 mt-4">
          <Input placeholder="Search username" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { setPage(1); load(); }}>Search</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">Username</th>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
                <th className="p-2">Credits</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b">
                  <td className="p-2">{u.username}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">
                    <Select value={u.role} onValueChange={(v) => changeRole(u.id, v as any)}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">{u.credit_balance}</td>
                  <td className="p-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => changeCredits(u.id, 10)}>+10</Button>
                    <Button size="sm" variant="outline" onClick={() => changeCredits(u.id, -10)}>-10</Button>
                    <Button size="sm" variant="secondary" onClick={() => {
                      const val = prompt('Set credits to:');
                      if (val) changeCredits(u.id, undefined, parseInt(val, 10));
                    }}>Set</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center mt-4">
          <Button disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
          <span>Page {page} / {totalPages}</span>
          <Button disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TeachersTab() {
  const [pending, setPending] = useState<AdminTeacherRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminListTeachersApi({ page, limit: 10, is_verified: false, search: search || undefined });
      setPending(res.data);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      toast({ title: 'Failed to load pending teachers', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  const verify = async (userId: string, value: boolean) => {
    try {
      await adminVerifyTeacherApi(userId, value);
      toast({ title: value ? 'Verified' : 'Denied' });
      load();
    } catch (e: any) {
      toast({ title: 'Failed to update verification', description: e.message, variant: 'destructive' });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Teachers</CardTitle>
        <CardDescription>Review and verify or deny teacher applications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Input placeholder="Search username/email/headline" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button onClick={() => { setPage(1); load(); }}>Search</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2">User</th>
                <th className="p-2">Email</th>
                <th className="p-2">Headline</th>
                <th className="p-2">Rate</th>
                <th className="p-2">Applied</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(p => (
                <tr key={p.user_id} className="border-b">
                  <td className="p-2 font-medium">{p.username}</td>
                  <td className="p-2">{p.email}</td>
                  <td className="p-2 truncate max-w-[280px]">{p.headline || '-'}</td>
                  <td className="p-2">{p.hourly_rate}</td>
                  <td className="p-2">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="p-2 flex gap-2">
                    <Button size="sm" onClick={() => verify(p.user_id, true)}>Verify</Button>
                    <Button size="sm" variant="destructive" onClick={() => verify(p.user_id, false)}>Deny</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center mt-4">
          <Button disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
          <span>Page {page} / {totalPages}</span>
          <Button disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FeesTab() {
  const [fees, setFees] = useState<PlatformFees | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const f = await adminGetFeesApi();
      setFees(f);
    } catch (e: any) {
      toast({ title: 'Failed to load fees', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = async () => {
    if (!fees) return;
    try {
      setLoading(true);
      // basic normalization
      const normalized: PlatformFees = {
        platformStudent: {
          platform: Number(fees.platformStudent.platform),
          teacher: Number(fees.platformStudent.teacher),
        },
        teacherAffiliateStudent: {
          platform: Number(fees.teacherAffiliateStudent.platform),
          teacher: Number(fees.teacherAffiliateStudent.teacher),
        },
      };
      await adminSetFeesApi(normalized);
      toast({ title: 'Fees updated' });
    } catch (e: any) {
      toast({ title: 'Failed to update fees', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!fees) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Fees</CardTitle>
          <CardDescription>Configure revenue share</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={load} disabled={loading}>Load Fees</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Fees</CardTitle>
        <CardDescription>Configure revenue share</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Platform-sourced student</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-muted-foreground">Platform %</label>
              <Input type="number" step="0.01" value={fees.platformStudent.platform}
                onChange={(e) => setFees({ ...fees, platformStudent: { ...fees.platformStudent, platform: parseFloat(e.target.value) } })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Teacher %</label>
              <Input type="number" step="0.01" value={fees.platformStudent.teacher}
                onChange={(e) => setFees({ ...fees, platformStudent: { ...fees.platformStudent, teacher: parseFloat(e.target.value) } })}
              />
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-2">Teacher-affiliate student</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-muted-foreground">Platform %</label>
              <Input type="number" step="0.01" value={fees.teacherAffiliateStudent.platform}
                onChange={(e) => setFees({ ...fees, teacherAffiliateStudent: { ...fees.teacherAffiliateStudent, platform: parseFloat(e.target.value) } })}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Teacher %</label>
              <Input type="number" step="0.01" value={fees.teacherAffiliateStudent.teacher}
                onChange={(e) => setFees({ ...fees, teacherAffiliateStudent: { ...fees.teacherAffiliateStudent, teacher: parseFloat(e.target.value) } })}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={update} disabled={loading}>Save</Button>
          <Button variant="outline" onClick={() => load()} disabled={loading}>Reset</Button>
        </div>
        <p className="text-sm text-muted-foreground">Values are stored in Redis. For production, consider persisting to DB with versioning.</p>
      </CardContent>
    </Card>
  );
}
