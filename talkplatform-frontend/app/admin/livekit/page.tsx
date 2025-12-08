"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Activity, 
  Users, 
  Clock, 
  BarChart3, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Monitor,
  Signal,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import axiosConfig from '@/api/axiosConfig';

interface LiveKitDashboardData {
  timestamp: string;
  active_meetings: Array<{
    id: string;
    title: string;
    current_participants: number;
    max_participants: number;
    started_at: string;
  }>;
  statistics: {
    meetings: {
      total_meetings: number;
      active_meetings: number;
      completed_meetings: number;
      total_active_participants: number;
      avg_participants: number;
    };
    bandwidth: Array<{
      hour: string;
      avg_bitrate: number;
      max_bitrate: number;
      measurement_count: number;
    }>;
    quality: Array<{
      quality: string;
      count: number;
    }>;
    recent_metrics: Array<{
      id: number;
      meetingId: string;
      userId: string;
      bitrate: number;
      packetLoss: number;
      quality: string;
      createdAt: string;
    }>;
  };
  livekit_status: {
    webhook_working: boolean;
    last_webhook_time: string | null;
  };
}

interface WebhookStatus {
  webhook_healthy: boolean;
  recent_metrics: number;
  recent_meetings: number;
  last_check: string;
  livekit_cloud_connected: boolean;
}

export default function LiveKitAdminPage() {
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<LiveKitDashboardData | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadWebhookStatus();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
      loadWebhookStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await axiosConfig.get('/livekit/monitoring/dashboard');
      setDashboardData(response.data);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load LiveKit dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadWebhookStatus = async () => {
    try {
      const response = await axiosConfig.get('/livekit/monitoring/webhook-status');
      setWebhookStatus(response.data);
    } catch (error: any) {
      console.error('Failed to load webhook status:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadWebhookStatus()]);
  };

  const testWebhook = async () => {
    try {
      const response = await axiosConfig.get('/livekit/monitoring/test-webhook');
      toast({
        title: "Webhook Test",
        description: response.data.message,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to test webhook",
        variant: "destructive",
      });
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatBitrate = (bitrate: number) => {
    if (bitrate > 1000000) {
      return `${(bitrate / 1000000).toFixed(1)}M`;
    } else if (bitrate > 1000) {
      return `${(bitrate / 1000).toFixed(1)}K`;
    }
    return `${bitrate}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">LiveKit Monitoring</h1>
            <p className="text-gray-600">Monitor your video calling infrastructure</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={testWebhook} variant="outline">
              Test Webhook
            </Button>
            <Button onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Webhook Status</p>
                  <p className="text-2xl font-bold">
                    {webhookStatus?.webhook_healthy ? 'Healthy' : 'Offline'}
                  </p>
                </div>
                {webhookStatus?.webhook_healthy ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Meetings</p>
                  <p className="text-2xl font-bold">
                    {dashboardData?.statistics.meetings.active_meetings || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Participants</p>
                  <p className="text-2xl font-bold">
                    {dashboardData?.statistics.meetings.total_active_participants || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">CloudConnected</p>
                  <p className="text-2xl font-bold">
                    {webhookStatus?.livekit_cloud_connected ? 'Yes' : 'No'}
                  </p>
                </div>
                {webhookStatus?.livekit_cloud_connected ? (
                  <Wifi className="w-8 h-8 text-green-500" />
                ) : (
                  <WifiOff className="w-8 h-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="live-meetings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="live-meetings">Live Meetings</TabsTrigger>
            <TabsTrigger value="bandwidth">Bandwidth</TabsTrigger>
            <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
            <TabsTrigger value="recent-events">Recent Events</TabsTrigger>
          </TabsList>

          <TabsContent value="live-meetings">
            <Card>
              <CardHeader>
                <CardTitle>Currently Active Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.active_meetings && dashboardData.active_meetings.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.active_meetings.map((meeting) => (
                      <div key={meeting.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h3 className="font-medium">{meeting.title}</h3>
                          <p className="text-sm text-gray-600">
                            Started: {new Date(meeting.started_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            <Users className="w-3 h-3 mr-1" />
                            {meeting.current_participants}/{meeting.max_participants}
                          </Badge>
                          <Badge variant="default" className="bg-green-500">Live</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No active meetings at the moment
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bandwidth">
            <Card>
              <CardHeader>
                <CardTitle>Bandwidth Usage (Last 24 Hours)</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.statistics.bandwidth && dashboardData.statistics.bandwidth.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.statistics.bandwidth.map((data, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{new Date(data.hour).toLocaleString()}</p>
                          <p className="text-sm text-gray-600">{data.measurement_count} measurements</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Avg: {formatBitrate(data.avg_bitrate)}bps</p>
                          <p className="text-sm text-gray-600">Max: {formatBitrate(data.max_bitrate)}bps</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No bandwidth data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality">
            <Card>
              <CardHeader>
                <CardTitle>Connection Quality (Last Hour)</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.statistics.quality && dashboardData.statistics.quality.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dashboardData.statistics.quality.map((data, index) => (
                      <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className={`w-12 h-12 mx-auto mb-2 rounded-full ${getQualityColor(data.quality)} flex items-center justify-center`}>
                          <Signal className="w-6 h-6 text-white" />
                        </div>
                        <p className="font-medium capitalize">{data.quality}</p>
                        <p className="text-sm text-gray-600">{data.count} connections</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No quality metrics available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent-events">
            <Card>
              <CardHeader>
                <CardTitle>Recent Webhook Events</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.statistics.recent_metrics && dashboardData.statistics.recent_metrics.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.statistics.recent_metrics.slice(0, 10).map((metric) => (
                      <div key={metric.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Meeting: {metric.meetingId.slice(0, 8)}...</p>
                          <p className="text-sm text-gray-600">User: {metric.userId}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getQualityColor(metric.quality)} variant="secondary">
                            {metric.quality}
                          </Badge>
                          <p className="text-sm text-gray-600">
                            {new Date(metric.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No recent webhook events
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Debug Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Last Update:</strong> {dashboardData?.timestamp}</p>
                <p><strong>Webhook Health:</strong> {webhookStatus?.webhook_healthy ? '✅ Healthy' : '❌ Unhealthy'}</p>
                <p><strong>Recent Metrics:</strong> {webhookStatus?.recent_metrics || 0}</p>
              </div>
              <div>
                <p><strong>Recent Meetings:</strong> {webhookStatus?.recent_meetings || 0}</p>
                <p><strong>Last Webhook:</strong> {dashboardData?.livekit_status.last_webhook_time || 'Never'}</p>
                <p><strong>Cloud Connected:</strong> {webhookStatus?.livekit_cloud_connected ? '✅ Yes' : '❌ No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}