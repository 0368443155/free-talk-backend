import AdminDashboardEnhanced from '@/components/admin-dashboard-enhanced';
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
      <AdminDashboardEnhanced initialData={initialData} />

      {/* LiveKit Dashboard */}
      {/* <AdminLiveKitDashboard /> */}
    </div>
  );
}