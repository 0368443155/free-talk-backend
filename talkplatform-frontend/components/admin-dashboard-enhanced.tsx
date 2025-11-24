"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { socket } from '../lib/socket';
import { Activity, ArrowDown, ArrowUp, Users, Server, Wifi, AlertTriangle, Monitor, Database, Cpu, HardDrive, FileCheck } from 'lucide-react';
import { AdminUserManagement } from './admin-user-management';
import { AdminTeacherVerification } from './admin-teacher-verification';

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

interface SystemHealth {
  cpuUsage: number;
  memoryUsage: number;
  dbConnections: number;
  dbResponseTime: number;
  uptime: number;
}

export default function AdminDashboardEnhanced({ initialData }: { initialData?: any }) {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalBandwidth: 0,
    activeUsers: 0,
    currentConnections: 0,
    avgResponseTime: 0,
    timestamp: new Date().toISOString()
  });
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    cpuUsage: 0,
    memoryUsage: 0,
    dbConnections: 0,
    dbResponseTime: 0,
    uptime: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Array<{id: string, severity: 'high' | 'medium' | 'low', message: string, timestamp: Date}>>([]);

  // Format bandwidth (bytes per second)
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Get status color and level
  const getStatusInfo = (value: number, thresholds: {good: number, warning: number}) => {
    if (value <= thresholds.good) return { color: 'text-green-500', level: 'Excellent', bgColor: 'bg-green-500' };
    if (value <= thresholds.warning) return { color: 'text-yellow-500', level: 'Good', bgColor: 'bg-yellow-500' };
    if (value <= thresholds.warning * 2) return { color: 'text-orange-500', level: 'Fair', bgColor: 'bg-orange-500' };
    return { color: 'text-red-500', level: 'Critical', bgColor: 'bg-red-500' };
  };

  // Get bandwidth status
  const getBandwidthStatus = (bandwidth: number) => 
    getStatusInfo(bandwidth, { good: 1024 * 100, warning: 1024 * 500 }); // 100KB/s good, 500KB/s warning

  // Get response time status  
  const getResponseTimeStatus = (responseTime: number) =>
    getStatusInfo(responseTime, { good: 100, warning: 500 }); // 100ms good, 500ms warning

  useEffect(() => {
    // === WebSocket Event Handlers ===
    function onConnect() {
      console.log('Connected to WebSocket');
      setIsConnected(true);
      socket.emit('join-admin-dashboard');
    }

    function onDisconnect() {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
    }

    function onSystemMetrics(data: SystemMetrics) {
      console.log('Received system metrics:', data);
      setSystemMetrics(data);
      
      // Check for alerts
      checkAlerts(data);
    }

    function onSystemHealth(data: SystemHealth) {
      console.log('Received system health:', data);
      setSystemHealth(data);
    }

    // Register listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('system-metrics', onSystemMetrics);
    socket.on('system-health', onSystemHealth);

    // Connect if not connected
    if (!socket.connected) {
      console.log('Connecting socket...');
      socket.connect();
    }

    // Cleanup
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('system-metrics', onSystemMetrics);
      socket.off('system-health', onSystemHealth);
      socket.emit('leave-admin-dashboard');
    };
  }, []);

  // Check for alerts based on metrics
  const checkAlerts = (metrics: SystemMetrics) => {
    const newAlerts: Array<{
      id: string;
      severity: 'high' | 'medium' | 'low';
      message: string;
      timestamp: Date;
    }> = [];
    
    if (metrics.totalBandwidth > 1024 * 1024) { // > 1MB/s
      newAlerts.push({
        id: Date.now() + '-bandwidth',
        severity: 'high',
        message: `High bandwidth usage: ${formatBytes(metrics.totalBandwidth)}`,
        timestamp: new Date()
      });
    }

    if (metrics.avgResponseTime > 1000) { // > 1s
      newAlerts.push({
        id: Date.now() + '-response',
        severity: 'medium',
        message: `High response time: ${metrics.avgResponseTime.toFixed(0)}ms`,
        timestamp: new Date()
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 10)); // Keep last 10 alerts
    }
  };

  // Fetch APIs
  const fetchRealtimeMetrics = async () => {
    try {
      const { axiosInstance } = await import('@/api/axiosConfig');
      const response = await axiosInstance.get('/metrics/realtime');
      if (response.status === 200) {
        setRealtimeMetrics(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch realtime metrics:', error);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const { axiosInstance } = await import('@/api/axiosConfig');
      const response = await axiosInstance.get('/metrics/hourly?hours=24');
      if (response.status === 200) {
        setHistoricalData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
    }
  };

  // Auto refresh when monitoring
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        fetchRealtimeMetrics();
        fetchHistoricalData();
      }, 10000); // 10 seconds
      
      // Initial fetch
      fetchRealtimeMetrics();
      fetchHistoricalData();
      
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const bandwidthStatus = getBandwidthStatus(systemMetrics.totalBandwidth);
  const responseTimeStatus = getResponseTimeStatus(systemMetrics.avgResponseTime);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive system monitoring and analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={isConnected ? "default" : "destructive"}>
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
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

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/10">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-orange-700 dark:text-orange-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                System Alerts ({alerts.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={clearAlerts}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="text-sm text-orange-700 dark:text-orange-300 flex justify-between">
                  <span>{alert.message}</span>
                  <span className="text-xs opacity-70">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bandwidth">Bandwidth</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="teacher-verifications">Teacher Verifications</TabsTrigger>
          <TabsTrigger value="historical">Historical Data</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* System Overview Cards */}
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
                  Status: {bandwidthStatus.level}
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
                <div className={`text-2xl font-bold ${responseTimeStatus.color}`}>
                  {Math.round(systemMetrics.avgResponseTime)}ms
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Status: {responseTimeStatus.level}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">CPU Usage:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full bg-blue-500`} style={{width: `${systemHealth.cpuUsage}%`}}></div>
                      </div>
                      <span className="text-sm">{systemHealth.cpuUsage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Memory:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full bg-green-500`} style={{width: `${systemHealth.memoryUsage}%`}}></div>
                      </div>
                      <span className="text-sm">{systemHealth.memoryUsage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Uptime:</span>
                    <span className="text-sm">{formatUptime(systemHealth.uptime)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Active Connections:</span>
                    <span className="text-sm font-medium">{systemHealth.dbConnections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Response Time:</span>
                    <span className="text-sm font-medium">{systemHealth.dbResponseTime.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Status:</span>
                    <Badge variant={systemHealth.dbResponseTime < 50 ? "default" : "destructive"}>
                      {systemHealth.dbResponseTime < 50 ? "Healthy" : "Slow"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bandwidth Tab */}
        <TabsContent value="bandwidth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-time Endpoint Metrics (Last 5 minutes)
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
                          <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
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
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Server Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>CPU Usage</span>
                    <span>{systemHealth.cpuUsage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${systemHealth.cpuUsage > 80 ? 'bg-red-500' : systemHealth.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{width: `${Math.min(systemHealth.cpuUsage, 100)}%`}}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Memory Usage</span>
                    <span>{systemHealth.memoryUsage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${systemHealth.memoryUsage > 80 ? 'bg-red-500' : systemHealth.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{width: `${Math.min(systemHealth.memoryUsage, 100)}%`}}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Database Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {systemHealth.dbConnections}
                    </div>
                    <div className="text-xs text-blue-600">Active Connections</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {systemHealth.dbResponseTime.toFixed(1)}ms
                    </div>
                    <div className="text-xs text-green-600">Avg Response Time</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <Badge variant={systemHealth.dbResponseTime < 50 ? "default" : "destructive"}>
                    Database {systemHealth.dbResponseTime < 50 ? "Healthy" : "Performance Issues"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <AdminUserManagement />
        </TabsContent>

        {/* Teacher Verifications Tab */}
        <TabsContent value="teacher-verifications" className="space-y-6">
          <AdminTeacherVerification />
        </TabsContent>

        {/* Historical Data Tab */}
        <TabsContent value="historical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historical Data (Last 24 Hours)</CardTitle>
            </CardHeader>
            <CardContent>
              {historicalData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Endpoint</th>
                        <th className="text-left p-2">Requests</th>
                        <th className="text-left p-2">Avg Response</th>
                        <th className="text-left p-2">Total Bandwidth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalData.slice(0, 20).map((data, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="p-2">{new Date(data.timestamp).toLocaleString()}</td>
                          <td className="p-2">{data.endpoint}</td>
                          <td className="p-2">{data.requestCount?.toLocaleString() || 0}</td>
                          <td className="p-2">{Math.round(data.avgResponseTime || 0)}ms</td>
                          <td className="p-2">{formatBytes((data.totalInboundBytes || 0) + (data.totalOutboundBytes || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2" />
                  <p>No historical data available</p>
                  <p className="text-xs">Historical data will appear here after system collects metrics</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}