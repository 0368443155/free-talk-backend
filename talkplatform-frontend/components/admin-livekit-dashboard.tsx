"use client";

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  LiveKitDashboardData,
  getLiveKitDashboardMetricsApi 
} from '@/api/livekit-metrics.rest';
import {
  Activity,
  Users,
  Wifi,
  Signal,
  TrendingUp,
  TrendingDown,
  Monitor,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface AdminLiveKitDashboardProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function AdminLiveKitDashboard({
  className,
  autoRefresh = true,
  refreshInterval = 5000
}: AdminLiveKitDashboardProps) {
  const [dashboardData, setDashboardData] = useState<LiveKitDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const data = await getLiveKitDashboardMetricsApi();
      setDashboardData(data);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch LiveKit metrics');
      console.error('Error fetching LiveKit dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    fetchDashboardData();

    // Set up auto-refresh
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchDashboardData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  const formatBitrate = (bitrate: number) => {
    if (bitrate > 1000000) return `${(bitrate / 1000000).toFixed(1)}M`;
    if (bitrate > 1000) return `${(bitrate / 1000).toFixed(0)}K`;
    return `${bitrate}`;
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500 bg-green-500/10';
      case 'good': return 'text-blue-500 bg-blue-500/10';
      case 'fair': return 'text-yellow-500 bg-yellow-500/10';
      case 'poor': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'good': return <Signal className="w-4 h-4 text-blue-500" />;
      case 'fair': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'poor': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading && !dashboardData) {
    return (
      <Card className={`${className} bg-gray-900 border-gray-700`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Activity className="w-5 h-5 animate-pulse" />
            LiveKit Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-300">Loading LiveKit metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} bg-gray-900 border-red-500/50`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertCircle className="w-5 h-5 text-red-500" />
            LiveKit Dashboard - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={fetchDashboardData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { stats, qualityDistribution, activeMeetings } = dashboardData;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wifi className="w-6 h-6 text-blue-500" />
          LiveKit Dashboard
        </h2>
        <div className="flex items-center gap-4">
          {lastRefresh && (
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
          <Button onClick={fetchDashboardData} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Meetings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.uniqueMeetings || 0}</div>
            <div className="flex items-center gap-1 mt-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-400">{stats?.uniqueUsers || 0} users</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg Bitrate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatBitrate(stats?.avgBitrate || 0)}bps
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-400">
                Max: {formatBitrate(stats?.maxBitrate || 0)}bps
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg Packet Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {(stats?.avgPacketLoss || 0).toFixed(2)}%
            </div>
            <div className="flex items-center gap-1 mt-1">
              {(stats?.avgPacketLoss || 0) > 2 ? (
                <TrendingDown className="w-4 h-4 text-red-400" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
              <span className="text-sm text-gray-400">
                Max: {(stats?.maxPacketLoss || 0).toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg RTT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {Math.round(stats?.avgRtt || 0)}ms
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-400">
                Jitter: {Math.round(stats?.avgJitter || 0)}ms
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Distribution */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Connection Quality Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {qualityDistribution?.map((item) => (
              <div key={item.quality} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getQualityIcon(item.quality)}
                  <span className="capitalize text-white">{item.quality}</span>
                </div>
                <div className="flex items-center gap-4 flex-1 ml-4">
                  <Progress value={item.percentage} className="flex-1" />
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <span className="text-sm text-gray-300">{item.count}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getQualityColor(item.quality)} border-current`}
                    >
                      {item.percentage.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Meetings */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Active Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeMeetings?.length > 0 ? (
            <div className="space-y-3">
              {activeMeetings.map((meeting) => (
                <div 
                  key={meeting.meetingId}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-white">Meeting {meeting.meetingId}</div>
                    <div className="text-sm text-gray-400">
                      {meeting.participantCount} participants
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-white">
                        {formatBitrate(meeting.avgBitrate)}bps
                      </div>
                      <div className="text-xs text-gray-400">
                        Quality: {meeting.avgQualityScore.toFixed(1)}/4.0
                      </div>
                    </div>
                    <Badge 
                      variant={meeting.avgQualityScore >= 3 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {meeting.avgQualityScore >= 3.5 ? 'Excellent' :
                       meeting.avgQualityScore >= 2.5 ? 'Good' :
                       meeting.avgQualityScore >= 1.5 ? 'Fair' : 'Poor'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p>No active LiveKit meetings</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}