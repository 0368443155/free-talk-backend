import AdminDashboardEnhanced from '@/components/admin-dashboard-enhanced';
import AdminRealtimeDashboard from '@/components/admin-realtime-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Activity, Settings, BarChart3, Monitor } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bandwidth Monitor - Admin',
  description: 'Comprehensive bandwidth monitoring and analytics across all meetings',
};

export default function BandwidthMonitorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Bandwidth Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Monitor and analyze network usage across all meetings in real-time
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Activity className="w-3 h-3 mr-1" />
              System Active
            </Badge>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">System Status</p>
                  <p className="text-2xl font-bold text-green-600">Online</p>
                </div>
                <Monitor className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Data Sources</p>
                  <p className="text-2xl font-bold text-blue-600">4</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Components</p>
                  <p className="text-2xl font-bold text-purple-600">Optimized</p>
                </div>
                <Settings className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Last Update</p>
                  <p className="text-2xl font-bold text-orange-600">Live</p>
                </div>
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="enhanced" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Enhanced Monitor
            </TabsTrigger>
            <TabsTrigger value="simulation" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Simulation
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Global Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <AdminRealtimeDashboard />
          </TabsContent>

          {/* Comprehensive Monitoring */}
          <TabsContent value="enhanced" className="space-y-6">
            <AdminDashboardEnhanced />
          </TabsContent>

          {/* Bandwidth Analytics */}
          <TabsContent value="simulation" className="space-y-6">
            <AdminDashboardEnhanced />
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Bandwidth System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Data Collection</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                        <span className="font-medium">WebRTC Statistics</span>
                        <Badge className="bg-green-100 text-green-800 border-green-200">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                        <span className="font-medium">Cross-tab Communication</span>
                        <Badge className="bg-green-100 text-green-800 border-green-200">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                        <span className="font-medium">Live Meetings API</span>
                        <Badge className="bg-green-100 text-green-800 border-green-200">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                        <span className="font-medium">Real-time Aggregation</span>
                        <Badge className="bg-green-100 text-green-800 border-green-200">Enabled</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">System Optimization</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                        <p className="font-medium">Update Interval</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">2 seconds for WebRTC data</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                        <p className="font-medium">Cleanup Interval</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">30 seconds for inactive users</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                        <p className="font-medium">Storage Method</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">LocalStorage with cross-tab sync</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                        <p className="font-medium">Data Retention</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Until user disconnect or 30s timeout</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-lg font-semibold mb-3">System Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="font-medium text-blue-800 dark:text-blue-400">Primary Service</p>
                      <p className="text-blue-600 dark:text-blue-300">admin-realtime-dashboard</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="font-medium text-green-800 dark:text-green-400">Data Sources</p>
                      <p className="text-green-600 dark:text-green-300">WebRTC + Cross-tab + API</p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="font-medium text-purple-800 dark:text-purple-400">Components</p>
                      <p className="text-purple-600 dark:text-purple-300">3 optimized components</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}