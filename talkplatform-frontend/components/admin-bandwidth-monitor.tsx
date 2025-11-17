'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, ArrowDown, ArrowUp, Users, Server, Play, Pause, RotateCcw } from 'lucide-react';

interface BandwidthData {
  timestamp: number;
  totalInbound: number; // bytes per second
  totalOutbound: number; // bytes per second
  activeUsers: number;
  avgPerUser: number;
}

export function AdminBandwidthMonitor() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [userCount, setUserCount] = useState(1000);
  const [currentData, setCurrentData] = useState<BandwidthData>({
    timestamp: Date.now(),
    totalInbound: 0,
    totalOutbound: 0,
    activeUsers: 0,
    avgPerUser: 0
  });
  const [totalConsumed, setTotalConsumed] = useState({
    inbound: 0,
    outbound: 0
  });
  const [history, setHistory] = useState<BandwidthData[]>([]);

  // Simulate realistic bandwidth usage
  const generateRealisticBandwidth = (users: number): BandwidthData => {
    // Base bandwidth per user (in bytes/second):
    // - Video call: ~200-800 KB/s per user
    // - Audio only: ~50-100 KB/s per user
    // - Screen sharing: +500-1500 KB/s
    
    const baseVideoPerUser = 300 * 1024; // 300 KB/s base video
    const baseAudioPerUser = 50 * 1024;  // 50 KB/s base audio
    
    // Add some randomness (±20%)
    const variance = 0.8 + Math.random() * 0.4;
    
    // Simulate different user activities
    const videoUsers = Math.floor(users * 0.7); // 70% video calls
    const audioUsers = Math.floor(users * 0.25); // 25% audio only
    const screenShareUsers = Math.floor(users * 0.05); // 5% screen sharing
    
    const videoInbound = videoUsers * baseVideoPerUser * variance;
    const videoOutbound = videoUsers * (baseVideoPerUser * 0.8) * variance; // Upload usually less
    
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

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format bandwidth (bytes per second)
  const formatBandwidth = (bps: number): string => {
    return formatBytes(bps) + '/s';
  };

  // Start/Stop simulation
  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
  };

  // Reset data
  const resetData = () => {
    setCurrentData({
      timestamp: Date.now(),
      totalInbound: 0,
      totalOutbound: 0,
      activeUsers: 0,
      avgPerUser: 0
    });
    setTotalConsumed({ inbound: 0, outbound: 0 });
    setHistory([]);
    setIsSimulating(false);
  };

  // Simulation effect
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const newData = generateRealisticBandwidth(userCount);
      setCurrentData(newData);
      
      // Update total consumed (accumulate over time)
      setTotalConsumed(prev => ({
        inbound: prev.inbound + newData.totalInbound,
        outbound: prev.outbound + newData.totalOutbound
      }));
      
      // Keep history (last 50 points for performance)
      setHistory(prev => [...prev.slice(-49), newData]);
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isSimulating, userCount]);

  // Get status color based on total bandwidth
  const getStatusColor = (totalBps: number) => {
    const totalMbps = (totalBps * 8) / (1024 * 1024); // Convert to Mbps
    if (totalMbps < 100) return 'bg-green-500';  // < 100 Mbps - Good
    if (totalMbps < 500) return 'bg-yellow-500'; // < 500 Mbps - Moderate
    if (totalMbps < 1000) return 'bg-orange-500'; // < 1 Gbps - High
    return 'bg-red-500'; // >= 1 Gbps - Critical
  };

  const getStatusLabel = (totalBps: number) => {
    const totalMbps = (totalBps * 8) / (1024 * 1024);
    if (totalMbps < 100) return 'Excellent';
    if (totalMbps < 500) return 'Good';
    if (totalMbps < 1000) return 'High';
    return 'Critical';
  };

  const totalBandwidth = currentData.totalInbound + currentData.totalOutbound;
  const totalMbps = (totalBandwidth * 8) / (1024 * 1024);
  const statusColor = getStatusColor(totalBandwidth);
  const statusLabel = getStatusLabel(totalBandwidth);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Bandwidth Simulation Controls
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
            <Button variant="outline" onClick={resetData}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-time Bandwidth
              <Badge className={`ml-auto ${statusColor} text-white`}>{statusLabel}</Badge>
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
                  {formatBandwidth(currentData.totalInbound)}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowUp className="h-4 w-4" />
                  <span>Total Outbound</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatBandwidth(currentData.totalOutbound)}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Active Users</span>
              </div>
              <p className="text-xl font-bold">{currentData.activeUsers.toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Average per User</div>
              <p className="text-lg font-semibold">{formatBandwidth(currentData.avgPerUser)}</p>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Bandwidth</div>
              <p className="text-lg font-semibold text-purple-600">
                {formatBandwidth(totalBandwidth)} ({totalMbps.toFixed(1)} Mbps)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cumulative Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Cumulative Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowDown className="h-4 w-4" />
                  <span>Total Downloaded</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatBytes(totalConsumed.inbound)}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowUp className="h-4 w-4" />
                  <span>Total Uploaded</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatBytes(totalConsumed.outbound)}
                </p>
              </div>

              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Grand Total</div>
                  <p className="text-xl font-bold text-purple-600">
                    {formatBytes(totalConsumed.inbound + totalConsumed.outbound)}
                  </p>
                </div>
              </div>

              {isSimulating && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>🔄 Simulation running... Data updates every second</p>
                  <p>📊 History: {history.length} data points</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bandwidth Breakdown */}
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
    </div>
  );
}