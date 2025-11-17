'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGlobalBandwidth } from '@/contexts/global-bandwidth-context';
import { useLiveMeetingsBandwidthService } from '@/hooks/use-live-meetings-bandwidth-service';
import { useMeetingBandwidthBridge } from '@/hooks/use-meeting-bandwidth-bridge';
import { useCrossTabBandwidth } from '@/hooks/use-cross-tab-bandwidth';
import { Activity, ArrowDown, ArrowUp, Users, Video, Play, Pause, RotateCcw, AlertTriangle, Server } from 'lucide-react';

interface SimulationData {
  timestamp: number;
  totalInbound: number;
  totalOutbound: number;
  activeUsers: number;
  avgPerUser: number;
}

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

export function EnhancedBandwidthMonitor() {
  const {
    globalStats,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetStats
  } = useGlobalBandwidth();

  // Live meetings bandwidth service - combines API live meetings with real WebRTC data
  const {
    stats: liveMeetingsStats,
    isLoading: isLoadingLive,
    error: liveError,
  } = useLiveMeetingsBandwidthService({ 
    enabled: isMonitoring, 
    fetchInterval: 10000 // Fetch live meetings every 10 seconds
  });

  // Meeting bandwidth bridge - direct data from active meeting rooms (same tab)
  const {
    meetings: bridgeMeetings,
    stats: bridgeStats
  } = useMeetingBandwidthBridge(isMonitoring);

  // Cross-tab bandwidth service - data from all tabs via localStorage
  const {
    meetings: crossTabMeetings,
    stats: crossTabStats
  } = useCrossTabBandwidth(isMonitoring);

  // Debug all data sources
  useEffect(() => {
    console.log(`🌉 [ENHANCED-MONITOR] Data sources update:`, {
      isMonitoring,
      bridgeMeetingsCount: bridgeMeetings.length,
      crossTabMeetingsCount: crossTabMeetings.length,
      bridgeStats,
      crossTabStats,
      crossTabMeetings
    });
  }, [isMonitoring, bridgeMeetings, bridgeStats, crossTabMeetings, crossTabStats]);

  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [userCount, setUserCount] = useState(1000);
  const [simulationData, setSimulationData] = useState<SimulationData>({
    timestamp: Date.now(),
    totalInbound: 0,
    totalOutbound: 0,
    activeUsers: 0,
    avgPerUser: 0
  });
  const [simulationTotalConsumed, setSimulationTotalConsumed] = useState({
    inbound: 0,
    outbound: 0
  });

  const [refreshKey, setRefreshKey] = useState(0);

  // Generate realistic bandwidth simulation
  const generateRealisticBandwidth = (users: number): SimulationData => {
    const baseVideoPerUser = 300 * 1024; // 300 KB/s
    const baseAudioPerUser = 50 * 1024;  // 50 KB/s
    
    const variance = 0.8 + Math.random() * 0.4;
    
    const videoUsers = Math.floor(users * 0.7);
    const audioUsers = Math.floor(users * 0.25);
    const screenShareUsers = Math.floor(users * 0.05);
    
    const videoInbound = videoUsers * baseVideoPerUser * variance;
    const videoOutbound = videoUsers * (baseVideoPerUser * 0.8) * variance;
    
    const audioInbound = audioUsers * baseAudioPerUser * variance;
    const audioOutbound = audioUsers * (baseAudioPerUser * 0.8) * variance;
    
    const screenInbound = screenShareUsers * (baseVideoPerUser + 800 * 1024) * variance;
    const screenOutbound = screenShareUsers * (baseVideoPerUser + 1200 * 1024) * variance;
    
    const totalInbound = videoInbound + audioInbound + screenInbound;
    const totalOutbound = videoOutbound + audioOutbound + screenOutbound;
    const avgPerUser = users > 0 ? (totalInbound + totalOutbound) / users / 2 : 0;
    
    return {
      timestamp: Date.now(),
      totalInbound,
      totalOutbound,
      activeUsers: users,
      avgPerUser
    };
  };

  // Get bandwidth status
  const getBandwidthStatus = (totalBps: number) => {
    const mbps = (totalBps * 8) / (1024 * 1024);
    if (mbps < 50) return { color: 'bg-green-500', label: 'Excellent', textColor: 'text-green-600' };
    if (mbps < 200) return { color: 'bg-blue-500', label: 'Good', textColor: 'text-blue-600' };
    if (mbps < 500) return { color: 'bg-yellow-500', label: 'Moderate', textColor: 'text-yellow-600' };
    if (mbps < 1000) return { color: 'bg-orange-500', label: 'High', textColor: 'text-orange-600' };
    return { color: 'bg-red-500', label: 'Critical', textColor: 'text-red-600' };
  };

  // Simulation control
  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
  };

  const resetSimulation = () => {
    setSimulationData({
      timestamp: Date.now(),
      totalInbound: 0,
      totalOutbound: 0,
      activeUsers: 0,
      avgPerUser: 0
    });
    setSimulationTotalConsumed({ inbound: 0, outbound: 0 });
    setIsSimulating(false);
  };

  // Auto refresh when monitoring
  useEffect(() => {
    if (!isMonitoring) return;
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Simulation effect
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const newData = generateRealisticBandwidth(userCount);
      setSimulationData(newData);
      
      setSimulationTotalConsumed(prev => ({
        inbound: prev.inbound + newData.totalInbound,
        outbound: prev.outbound + newData.totalOutbound
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, userCount]);

  // Calculate stats for current tab - prioritize cross-tab data (all tabs), then bridge (same tab), then live meetings, then global context
  const hasCrossTabData = crossTabStats.totalMeetings > 0;
  const hasBridgeData = bridgeStats.totalMeetings > 0;
  const hasLiveData = liveMeetingsStats.totalLiveMeetings > 0;
  
  const realTimeBandwidth = hasCrossTabData 
    ? crossTabStats.totalBandwidth 
    : (hasBridgeData 
      ? bridgeStats.totalBandwidth 
      : (hasLiveData ? liveMeetingsStats.totalBandwidth : globalStats.totalBandwidthBps));
    
  const realTimeStats = hasCrossTabData ? {
    totalMeetings: crossTabStats.totalMeetings,
    totalParticipants: crossTabStats.totalParticipants,
    totalBandwidthBps: crossTabStats.totalBandwidth
  } : (hasBridgeData ? {
    totalMeetings: bridgeStats.totalMeetings,
    totalParticipants: bridgeStats.totalParticipants,
    totalBandwidthBps: bridgeStats.totalBandwidth
  } : (hasLiveData ? {
    totalMeetings: liveMeetingsStats.totalLiveMeetings,
    totalParticipants: liveMeetingsStats.totalParticipants,
    totalBandwidthBps: liveMeetingsStats.totalBandwidth
  } : globalStats));
  
  const realStatus = getBandwidthStatus(realTimeBandwidth);
  const simStatus = getBandwidthStatus(simulationData.totalInbound + simulationData.totalOutbound);
  
  // Use cross-tab meetings (priority), then bridge meetings, then live meetings, then WebRTC detected meetings
  const activeMeetings = hasCrossTabData 
    ? crossTabMeetings 
    : (hasBridgeData 
      ? bridgeMeetings 
      : (hasLiveData ? liveMeetingsStats.meetings : Array.from(globalStats.meetings.values()).filter(m => m.isActive)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Enhanced Bandwidth Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="real-time" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="real-time">Real-Time Data</TabsTrigger>
              <TabsTrigger value="simulation">Simulation</TabsTrigger>
            </TabsList>

            {/* Real-Time Tab */}
            <TabsContent value="real-time" className="space-y-6">
              {/* Real-Time Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Real-Time Monitoring
                    </div>
                    <Badge className={`${realStatus.color} text-white`}>
                      {realStatus.label}
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

              {/* Real-Time Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Bandwidth</p>
                        <p className={`text-2xl font-bold ${realStatus.textColor}`}>
                          {formatMbps(realTimeBandwidth)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatBandwidth(realTimeBandwidth)}
                        </p>
                        {isMonitoring && (
                          <p className="text-xs text-green-500">Real-time WebRTC data</p>
                        )}
                      </div>
                      <Activity className={`h-8 w-8 ${realStatus.textColor}`} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Meetings</p>
                        <p className="text-2xl font-bold">{realTimeStats.totalMeetings}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {hasCrossTabData 
                            ? `${activeMeetings.length} cross-tab active meetings`
                            : (hasBridgeData 
                              ? `${activeMeetings.length} active meeting rooms`
                              : (hasLiveData 
                                ? `${activeMeetings.length} live meetings with data`
                                : `${activeMeetings.length} WebRTC connections detected`))
                          }
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
                        <p className="text-2xl font-bold">{realTimeStats.totalParticipants}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Avg: {formatBandwidth(realTimeStats.totalParticipants > 0 ? realTimeBandwidth / realTimeStats.totalParticipants : 0)}/user
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

              {/* Real-Time Meeting Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Meetings Detail</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeMeetings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{hasCrossTabData ? "No cross-tab meetings detected" : (hasLiveData ? "No live meetings with bandwidth data" : "No active WebRTC connections detected")}</p>
                      <p className="text-sm mt-1">
                        {isMonitoring 
                          ? "Join a meeting with video/audio enabled to see real-time bandwidth data"
                          : "Start monitoring to detect live meetings and bandwidth data"
                        }
                      </p>
                      {liveError && (
                        <p className="text-sm text-red-500 mt-2">Error: {liveError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {hasCrossTabData ? (
                        // Show cross-tab meetings (priority 1)
                        crossTabMeetings
                          .sort((a, b) => b.bandwidth.total - a.bandwidth.total)
                          .map((meeting) => {
                            const lastUpdateAgo = Math.floor((Date.now() - meeting.lastUpdated) / 1000);
                            
                            return (
                              <div key={meeting.meetingId} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <h4 className="font-semibold">
                                      {meeting.meetingTitle}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {meeting.participantCount} participants • Cross-Tab Data • Updated {lastUpdateAgo}s ago
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    {formatMbps(meeting.bandwidth.total)}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-blue-600">↓ {meeting.bandwidth.inboundFormatted}</span>
                                  </div>
                                  <div>
                                    <span className="text-green-600">↑ {meeting.bandwidth.outboundFormatted}</span>
                                  </div>
                                </div>
                                
                                <div className="mt-2 text-xs text-muted-foreground">
                                  🔄 Cross-Tab Real-Time Data • Total: {meeting.bandwidth.totalFormatted}
                                </div>
                              </div>
                            );
                          })
                      ) : hasBridgeData ? (
                        // Show bridge meetings (priority 2)
                        bridgeMeetings
                          .sort((a, b) => b.bandwidth.total - a.bandwidth.total)
                          .map((meeting) => {
                            const lastUpdateAgo = Math.floor((Date.now() - meeting.lastUpdated) / 1000);
                            
                            return (
                              <div key={meeting.meetingId} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <h4 className="font-semibold">
                                      {meeting.meetingTitle}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {meeting.participantCount} participants • Bridge Data • Updated {lastUpdateAgo}s ago
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {formatMbps(meeting.bandwidth.total)}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-blue-600">↓ {meeting.bandwidth.inboundFormatted}</span>
                                  </div>
                                  <div>
                                    <span className="text-green-600">↑ {meeting.bandwidth.outboundFormatted}</span>
                                  </div>
                                </div>
                                
                                <div className="mt-2 text-xs text-muted-foreground">
                                  🌉 Bridge Real-Time Data • Total: {meeting.bandwidth.totalFormatted}
                                </div>
                              </div>
                            );
                          })
                      ) : hasLiveData ? (
                        // Show live meetings with real bandwidth data (priority 3)
                        liveMeetingsStats.meetings
                          .sort((a, b) => (b.realBandwidth?.total || 0) - (a.realBandwidth?.total || 0))
                          .map((meeting) => {
                            const lastUpdateAgo = Math.floor((Date.now() - meeting.lastUpdated) / 1000);
                            const hasBandwidth = meeting.realBandwidth;
                            
                            return (
                              <div key={meeting.meetingId} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <h4 className="font-semibold">
                                      {meeting.meetingTitle}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {meeting.participantCount} participants • Live Meeting • Updated {lastUpdateAgo}s ago
                                    </p>
                                  </div>
                                  <Badge variant="outline" className={hasBandwidth ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-700 border-gray-200"}>
                                    {hasBandwidth ? formatMbps(meeting.realBandwidth!.total) : "No data"}
                                  </Badge>
                                </div>
                                
                                {hasBandwidth ? (
                                  <>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-blue-600">↓ {meeting.realBandwidth!.formatted.inbound}</span>
                                      </div>
                                      <div>
                                        <span className="text-green-600">↑ {meeting.realBandwidth!.formatted.outbound}</span>
                                      </div>
                                    </div>
                                    <div className="mt-2 text-xs text-muted-foreground">
                                      📊 Live API Data • Total: {meeting.realBandwidth!.formatted.total}
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-sm text-muted-foreground">
                                    Waiting for WebRTC bandwidth data...
                                  </div>
                                )}
                              </div>
                            );
                          })
                      ) : (
                        // Fallback: Show WebRTC detected meetings (priority 4)
                        activeMeetings
                          .filter(meeting => meeting.stats) // Only show meetings with stats
                          .sort((a, b) => (b.stats.inbound + b.stats.outbound) - (a.stats.inbound + a.stats.outbound))
                          .map((meeting) => {
                            const meetingBandwidth = meeting.stats.inbound + meeting.stats.outbound;
                            const lastUpdateAgo = Math.floor((Date.now() - meeting.lastUpdated) / 1000);
                            
                            return (
                              <div key={meeting.meetingId} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <h4 className="font-semibold">
                                      {meeting.meetingTitle || `Meeting ${meeting.meetingId.slice(0, 8)}...`}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {meeting.participantCount} participants • WebRTC Detected • Updated {lastUpdateAgo}s ago
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
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
                                  📊 WebRTC Fallback • Total received: {meeting.stats.totalInboundFormatted} • Total sent: {meeting.stats.totalOutboundFormatted}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Simulation Tab */}
            <TabsContent value="simulation" className="space-y-6">
              {/* Simulation Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      Bandwidth Simulation
                    </div>
                    <Badge className={`${simStatus.color} text-white`}>
                      {simStatus.label}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="userCount">Number of Users</Label>
                      <Input
                        id="userCount"
                        type="number"
                        value={userCount}
                        onChange={(e) => setUserCount(Number(e.target.value))}
                        min="1"
                        max="10000"
                        disabled={isSimulating}
                        className="w-32"
                      />
                    </div>
                    <Button 
                      onClick={toggleSimulation}
                      className={isSimulating ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                    >
                      {isSimulating ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                      {isSimulating ? 'Stop' : 'Start'} Simulation
                    </Button>
                    <Button variant="outline" onClick={resetSimulation}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Simulation Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Real-time Simulation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowDown className="h-4 w-4" />
                          <span>Total Inbound</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatBandwidth(simulationData.totalInbound)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowUp className="h-4 w-4" />
                          <span>Total Outbound</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {formatBandwidth(simulationData.totalOutbound)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Simulated Users</span>
                      </div>
                      <p className="text-xl font-bold">{simulationData.activeUsers.toLocaleString()}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Total Bandwidth</div>
                      <p className="text-lg font-semibold text-purple-600">
                        {formatMbps(simulationData.totalInbound + simulationData.totalOutbound)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Cumulative Usage</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowDown className="h-4 w-4" />
                          <span>Total Downloaded</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatBytes(simulationTotalConsumed.inbound)}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowUp className="h-4 w-4" />
                          <span>Total Uploaded</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {formatBytes(simulationTotalConsumed.outbound)}
                        </p>
                      </div>

                      <div className="pt-4 border-t">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Grand Total</div>
                          <p className="text-xl font-bold text-purple-600">
                            {formatBytes(simulationTotalConsumed.inbound + simulationTotalConsumed.outbound)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Simulation Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Bandwidth Breakdown (Simulated User Types)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-blue-600">Video Callers (70%)</h4>
                      <p className="text-sm text-muted-foreground">~300 KB/s per user</p>
                      <p className="font-bold">{(userCount * 0.7).toFixed(0)} users</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-green-600">Audio Only (25%)</h4>
                      <p className="text-sm text-muted-foreground">~50 KB/s per user</p>
                      <p className="font-bold">{(userCount * 0.25).toFixed(0)} users</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-purple-600">Screen Sharing (5%)</h4>
                      <p className="text-sm text-muted-foreground">~800+ KB/s per user</p>
                      <p className="font-bold">{(userCount * 0.05).toFixed(0)} users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}