'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useGlobalBandwidth } from '@/contexts/global-bandwidth-context';
import { Activity, ArrowDown, ArrowUp, Users, Video, Play, Pause, RotateCcw, AlertTriangle } from 'lucide-react';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatBandwidth = (bps: number): string => {
  return formatBytes(bps) + '/s';
};

const formatMbps = (bps: number): string => {
  const mbps = (bps * 8) / (1024 * 1024);
  return mbps.toFixed(2) + ' Mbps';
};

export function RealTimeBandwidthMonitor() {
  const {
    globalStats,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetStats
  } = useGlobalBandwidth();

  const [refreshKey, setRefreshKey] = useState(0);

  // Auto refresh display every second when monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Get bandwidth status color
  const getBandwidthStatus = (totalBps: number) => {
    const mbps = (totalBps * 8) / (1024 * 1024);
    if (mbps < 50) return { color: 'bg-green-500', label: 'Excellent', textColor: 'text-green-600' };
    if (mbps < 200) return { color: 'bg-blue-500', label: 'Good', textColor: 'text-blue-600' };
    if (mbps < 500) return { color: 'bg-yellow-500', label: 'Moderate', textColor: 'text-yellow-600' };
    if (mbps < 1000) return { color: 'bg-orange-500', label: 'High', textColor: 'text-orange-600' };
    return { color: 'bg-red-500', label: 'Critical', textColor: 'text-red-600' };
  };

  const status = getBandwidthStatus(globalStats.totalBandwidthBps);
  const activeMeetings = Array.from(globalStats.meetings.values()).filter(m => m.isActive);
  const totalMbps = (globalStats.totalBandwidthBps * 8) / (1024 * 1024);

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-Time Bandwidth Monitor
            </div>
            <Badge className={`${status.color} text-white`}>
              {status.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={isMonitoring ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {isMonitoring ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </Button>
            <Button variant="outline" onClick={resetStats}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Data
            </Button>
            <div className="text-sm text-muted-foreground ml-4">
              {isMonitoring ? (
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live monitoring active
                </span>
              ) : (
                <span className="text-gray-500">Monitoring stopped</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bandwidth</p>
                <p className={`text-2xl font-bold ${status.textColor}`}>
                  {formatMbps(globalStats.totalBandwidthBps)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatBandwidth(globalStats.totalBandwidthBps)}
                </p>
              </div>
              <Activity className={`h-8 w-8 ${status.textColor}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Meetings</p>
                <p className="text-2xl font-bold">{globalStats.totalMeetings}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeMeetings.length} active now
                </p>
              </div>
              <Video className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Participants</p>
                <p className="text-2xl font-bold">{globalStats.totalParticipants}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {formatBandwidth(globalStats.averageBandwidthPerParticipant)}/user
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Consumed</p>
                <p className="text-2xl font-bold">
                  {formatBytes(globalStats.totalInboundBytes + globalStats.totalOutboundBytes)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Since monitoring started
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bandwidth Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Bandwidth Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Total Inbound</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatBandwidth(globalStats.totalInboundBps)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total received: {formatBytes(globalStats.totalInboundBytes)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-green-600" />
                <span className="font-medium">Total Outbound</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatBandwidth(globalStats.totalOutboundBps)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total sent: {formatBytes(globalStats.totalOutboundBytes)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Details */}
      <Card>
        <CardHeader>
          <CardTitle>Active Meetings Detail</CardTitle>
        </CardHeader>
        <CardContent>
          {activeMeetings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active meetings being monitored</p>
              <p className="text-sm mt-1">
                {isMonitoring ? "Meetings will appear here when users join video calls" : "Start monitoring to see real-time data"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeMeetings
                .sort((a, b) => (b.stats.inbound + b.stats.outbound) - (a.stats.inbound + a.stats.outbound))
                .map((meeting) => {
                  const meetingBandwidth = meeting.stats.inbound + meeting.stats.outbound;
                  const meetingMbps = (meetingBandwidth * 8) / (1024 * 1024);
                  const lastUpdateAgo = Math.floor((Date.now() - meeting.lastUpdated) / 1000);
                  
                  return (
                    <div key={meeting.meetingId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">
                            {meeting.meetingTitle || `Meeting ${meeting.meetingId.slice(0, 8)}...`}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {meeting.participantCount} participants • Updated {lastUpdateAgo}s ago
                          </p>
                        </div>
                        <Badge variant="outline">
                          {formatMbps(meetingBandwidth)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-blue-600">↓ {meeting.stats.inboundFormatted}</span>
                        </div>
                        <div>
                          <span className="text-green-600">↑ {meeting.stats.outboundFormatted}</span>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        Total: {meeting.stats.totalInboundFormatted} received, {meeting.stats.totalOutboundFormatted} sent
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
        </CardContent>
      </Card>

      {!isMonitoring && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-800">Monitoring Stopped</h4>
              <p className="text-blue-700 text-sm mt-1">
                Click "Start Monitoring" to begin collecting real-time bandwidth data from active meetings. 
                Monitoring uses WebRTC stats API to measure actual network usage.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}