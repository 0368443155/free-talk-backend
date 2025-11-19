"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { socket } from '../lib/socket';
import { Activity, ArrowDown, ArrowUp, Users, Server, Wifi, AlertTriangle } from 'lucide-react';

interface SystemMetrics {
  totalBandwidth: number;
  activeUsers: number;
  currentConnections: number;
  avgResponseTime: number;
  timestamp: string;
}

interface RealtimeMetrics {
  endpoint: string;
  totalInbound: number;
  totalOutbound: number;
  avgResponseTime: number;
  requestCount: number;
  maxConnections: number;
}

export default function AdminRealtimeDashboard({ initialData }: { initialData?: any }) {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalBandwidth: 0,
    activeUsers: 0,
    currentConnections: 0,
    avgResponseTime: 0,
    timestamp: new Date().toISOString()
  });
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Format bandwidth (bytes per second)
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get bandwidth status color
  const getBandwidthStatus = (bandwidth: number) => {
    if (bandwidth < 1024 * 100) return { color: 'text-green-500', status: 'Excellent' }; // < 100KB/s
    if (bandwidth < 1024 * 500) return { color: 'text-yellow-500', status: 'Good' }; // < 500KB/s
    if (bandwidth < 1024 * 1024) return { color: 'text-orange-500', status: 'Fair' }; // < 1MB/s
    return { color: 'text-red-500', status: 'Critical' }; // >= 1MB/s
  };

  useEffect(() => {
    // === 1. Định nghĩa các hàm xử lý sự kiện ===
    function onConnect() {
      console.log('Connected to WebSocket');
      setIsConnected(true);
      // Tham gia vào room admin dashboard
      socket.emit('join-admin-dashboard');
    }

    function onDisconnect() {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
    }

    function onSystemMetrics(data: SystemMetrics) {
      console.log('Received system metrics:', data);
      setSystemMetrics(data);
    }

    // === 2. Gán listeners ===
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('system-metrics', onSystemMetrics);

    // === 3. Thực hiện kết nối ===
    if (!socket.connected) {
      console.log('Connecting socket...');
      socket.connect();
    }

    // === 4. HÀM DỌN DẸP (RẤT QUAN TRỌNG) ===
    return () => {
      console.log('Cleaning up WebSocket listeners');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('system-metrics', onSystemMetrics);
      socket.emit('leave-admin-dashboard');
    };
  }, []);

  // Fetch realtime metrics từ API
  const fetchRealtimeMetrics = async () => {
    try {
      const response = await fetch('/api/metrics/realtime');
      if (response.ok) {
        const data = await response.json();
        setRealtimeMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch realtime metrics:', error);
    }
  };

  // Auto refresh metrics khi monitoring
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(fetchRealtimeMetrics, 10000); // 10 giây
      fetchRealtimeMetrics(); // Gọi ngay lập tức
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const bandwidthStatus = getBandwidthStatus(systemMetrics.totalBandwidth);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Real-time system bandwidth monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Button 
            onClick={toggleMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
          >
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              Total Bandwidth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${bandwidthStatus.color}`}>
              {formatBytes(systemMetrics.totalBandwidth)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Status: {bandwidthStatus.status}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics.activeUsers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics.currentConnections.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(systemMetrics.avgResponseTime)}ms
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average latency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Endpoint Metrics (Last 5 minutes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isMonitoring ? (
            realtimeMetrics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Endpoint</th>
                      <th className="text-left p-2">Requests</th>
                      <th className="text-left p-2">Total Bandwidth</th>
                      <th className="text-left p-2">Avg Response</th>
                      <th className="text-left p-2">Max Connections</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realtimeMetrics.map((metric, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{metric.endpoint}</td>
                        <td className="p-2">{metric.requestCount.toLocaleString()}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600">
                              ↓ {formatBytes(metric.totalInbound)}
                            </span>
                            <span className="text-green-600">
                              ↑ {formatBytes(metric.totalOutbound)}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">{Math.round(metric.avgResponseTime)}ms</td>
                        <td className="p-2">{metric.maxConnections}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>No metrics data available</p>
                <p className="text-xs">Metrics will appear here when system activity is detected</p>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p>Monitoring stopped</p>
              <p className="text-xs">Click "Start Monitoring" to begin collecting real-time data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}