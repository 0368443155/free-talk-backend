import AdminDashboardEnhanced from '@/components/admin-dashboard-enhanced';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Users, ShieldCheck } from 'lucide-react';
// import { AdminLiveKitDashboard } from '@/components/admin-livekit-dashboard';

// Hàm này chạy trên server
async function getHistoricalData() {
  try {
    // Giả sử chúng ta có một endpoint để lấy dữ liệu đã tổng hợp
    const res = await fetch('http://localhost:3000/api/metrics/public/hourly', {
      cache: 'no-store' // Đảm bảo dữ liệu luôn mới
    });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    return null;
  }
}

// Component này render trên server 
export default async function AdminPage() {
  const initialData = await getHistoricalData();

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/withdrawals">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Withdrawal Management
              </CardTitle>
              <CardDescription>Manage teacher withdrawal requests</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
              <CardDescription>Manage users and teachers</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Teacher Verification
              </CardTitle>
              <CardDescription>Approve teacher verifications</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <AdminDashboardEnhanced initialData={initialData} />

      {/* LiveKit Dashboard */}
      {/* <AdminLiveKitDashboard /> */}
    </div>
  );
}