"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Monitor,
  Camera,
  Headphones,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Play,
  Pause,
} from 'lucide-react';

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface GreenRoomProps {
  onJoinMeeting: (deviceSettings: DeviceSettings) => void;
  onCancel: () => void;
  meetingTitle: string;
  isWaitingRoom?: boolean;
}

export interface DeviceSettings {
  audioInput: string;
  videoInput: string;
  audioOutput: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  virtualBackground: boolean;
  backgroundBlur: number;
  audioLevel: number;
  mediaStream?: MediaStream; // Optional: Reuse stream from green-room to avoid duplicate permission requests
}

/**
 * UC-02: Green Room Component - Pre-join device check and configuration
 * Allows users to test and configure their media devices before joining the meeting
 */
export function GreenRoom({ onJoinMeeting, onCancel, meetingTitle, isWaitingRoom = false }: GreenRoomProps) {
  // Device lists
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDevice[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDevice[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDevice[]>([]);

  // Selected devices
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Audio visualization
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Virtual background
  const [virtualBackground, setVirtualBackground] = useState(false);
  const [backgroundBlur, setBackgroundBlur] = useState(0);

  // Video preview
  const videoRef = useRef<HTMLVideoElement>(null);

  // Test audio
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const testAudioRef = useRef<HTMLAudioElement>(null);

  // Ref to track current stream for cleanup without triggering re-renders
  const currentStreamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  // UC-02: Load and enumerate available media devices
  const loadMediaDevices = useCallback(async () => {
    try {
      // Request permissions first
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });

      // Stop the temporary stream
      stream.getTracks().forEach(track => track.stop());

      // Now enumerate devices (labels will be available)
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput');

      setAudioInputDevices(audioInputs.map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${audioInputs.indexOf(d) + 1}`,
        kind: d.kind,
      })));

      setVideoInputDevices(videoInputs.map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${videoInputs.indexOf(d) + 1}`,
        kind: d.kind,
      })));

      setAudioOutputDevices(audioOutputs.map(d => ({
        deviceId: d.deviceId,
        label: d.label || `Speaker ${audioOutputs.indexOf(d) + 1}`,
        kind: d.kind,
      })));

      // UC-02: Load previously saved device preferences from localStorage
      const savedAudioInput = localStorage.getItem('preferredAudioInput');
      const savedVideoInput = localStorage.getItem('preferredVideoInput');
      const savedAudioOutput = localStorage.getItem('preferredAudioOutput');

      if (savedAudioInput && audioInputs.find(d => d.deviceId === savedAudioInput)) {
        setSelectedAudioInput(savedAudioInput);
      } else if (audioInputs.length > 0) {
        setSelectedAudioInput(audioInputs[0].deviceId);
      }

      if (savedVideoInput && videoInputs.find(d => d.deviceId === savedVideoInput)) {
        setSelectedVideoInput(savedVideoInput);
      } else if (videoInputs.length > 0) {
        setSelectedVideoInput(videoInputs[0].deviceId);
      }

      if (savedAudioOutput && audioOutputs.find(d => d.deviceId === savedAudioOutput)) {
        setSelectedAudioOutput(savedAudioOutput);
      } else if (audioOutputs.length > 0) {
        setSelectedAudioOutput(audioOutputs[0].deviceId);
      }

    } catch (error) {
      console.error('Failed to load media devices:', error);
      setPermissionError('Unable to access camera and microphone. Please check your permissions.');
    }
  }, []);

  // UC-02: Audio level visualization for microphone test
  const setupAudioVisualization = useCallback((stream: MediaStream) => {
    try {
      // Check state before closing to avoid InvalidStateError
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start visualization loop
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average amplitude
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const normalizedLevel = Math.min(100, (average / 255) * 100);

        setAudioLevel(normalizedLevel);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();

    } catch (error) {
      console.error('Failed to setup audio visualization:', error);
    }
  }, []);

  // UC-02: Start media stream with selected devices
  const startMediaStream = useCallback(async () => {
    if (!selectedAudioInput || !selectedVideoInput) return;

    try {
      setIsLoading(true);

      // Stop existing stream using ref to avoid dependency loop
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Create new stream with selected devices
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedAudioInput ? { exact: selectedAudioInput } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          deviceId: selectedVideoInput ? { exact: selectedVideoInput } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });

      currentStreamRef.current = stream;
      setLocalStream(stream);

      // UC-02: Setup audio level visualization
      setupAudioVisualization(stream);

      setIsLoading(false);

    } catch (error) {
      console.error('Failed to start media stream:', error);
      setPermissionError('Unable to access selected devices. Please try different devices.');
      setIsLoading(false);
    }
  }, [selectedAudioInput, selectedVideoInput, setupAudioVisualization]);

  // UC-02: Attach stream to video element when it becomes available
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, isLoading]);

  // UC-02: Toggle media tracks
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // UC-02: Test audio output
  const testAudioOutput = useCallback(async () => {
    if (!selectedAudioOutput || isTestingAudio) return;

    try {
      setIsTestingAudio(true);

      // Create test audio element
      const audio = new Audio('/test-audio.mp3'); // You need to add a test audio file

      // Set audio output device (if supported)
      if ('setSinkId' in audio && typeof (audio as any).setSinkId === 'function') {
        await (audio as any).setSinkId(selectedAudioOutput);
      }

      audio.volume = 0.5;
      await audio.play();

      audio.onended = () => {
        setIsTestingAudio(false);
      };

      testAudioRef.current = audio;

      toast({
        title: "Audio Test",
        description: "Playing test sound through selected speakers.",
      });

    } catch (error) {
      console.error('Failed to test audio output:', error);
      setIsTestingAudio(false);
      toast({
        title: "Audio Test Failed",
        description: "Could not play test sound. Please check your speakers.",
        variant: "destructive",
      });
    }
  }, [selectedAudioOutput, isTestingAudio, toast]);

  // Handle device changes
  const handleDeviceChange = useCallback((deviceType: 'audio' | 'video' | 'output', deviceId: string) => {
    if (deviceType === 'audio') {
      setSelectedAudioInput(deviceId);
      localStorage.setItem('preferredAudioInput', deviceId);
    } else if (deviceType === 'video') {
      setSelectedVideoInput(deviceId);
      localStorage.setItem('preferredVideoInput', deviceId);
    } else if (deviceType === 'output') {
      setSelectedAudioOutput(deviceId);
      localStorage.setItem('preferredAudioOutput', deviceId);
    }
  }, []);

  // UC-02: Handle devicechange event (when user plugs/unplugs devices)
  useEffect(() => {
    const handleDeviceChange = () => {
      console.log('Device change detected, reloading devices...');
      loadMediaDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [loadMediaDevices]);

  // Initialize devices and stream
  useEffect(() => {
    loadMediaDevices();
  }, [loadMediaDevices]);

  useEffect(() => {
    if (selectedAudioInput && selectedVideoInput) {
      startMediaStream();
    }
  }, [selectedAudioInput, selectedVideoInput, startMediaStream]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (testAudioRef.current) {
        testAudioRef.current.pause();
      }
    };
  }, []);

  const handleJoinMeeting = () => {
    // UC-02: Save final device settings
    // Include the current stream to reuse it in LiveKit and avoid duplicate permission requests
    const deviceSettings: DeviceSettings = {
      audioInput: selectedAudioInput,
      videoInput: selectedVideoInput,
      audioOutput: selectedAudioOutput,
      audioEnabled,
      videoEnabled,
      virtualBackground,
      backgroundBlur,
      audioLevel,
      mediaStream: currentStreamRef.current || null, // Pass stream to reuse
    };

    onJoinMeeting(deviceSettings);
  };

  if (permissionError) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Permission Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>{permissionError}</p>
          <div className="flex gap-2">
            <Button onClick={loadMediaDevices} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button onClick={onCancel} variant="ghost">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          {isWaitingRoom ? 'Waiting Room - Device Setup' : 'Ready to Join?'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Meeting: <strong>{meetingTitle}</strong>
        </p>
        {isWaitingRoom && (
          <Badge variant="secondary" className="w-fit">
            You'll be admitted by the host after joining
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Video Preview */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Video Preview</Label>
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-white" />
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{
                    filter: virtualBackground ? `blur(${backgroundBlur}px)` : 'none',
                  }}
                />
              )}

              {/* Video controls overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
                <Button
                  size="sm"
                  variant={videoEnabled ? "secondary" : "destructive"}
                  onClick={toggleVideo}
                >
                  {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant={audioEnabled ? "secondary" : "destructive"}
                  onClick={toggleAudio}
                >
                  {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Virtual Background Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="virtual-bg">Virtual Background</Label>
                <Switch
                  id="virtual-bg"
                  checked={virtualBackground}
                  onCheckedChange={setVirtualBackground}
                />
              </div>
              {virtualBackground && (
                <div className="space-y-2">
                  <Label>Background Blur: {backgroundBlur}px</Label>
                  <Slider
                    value={[backgroundBlur]}
                    onValueChange={(value) => setBackgroundBlur(value[0])}
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Device Settings */}
          <div className="space-y-6">
            {/* Camera Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Camera
              </Label>
              <Select
                value={selectedVideoInput}
                onValueChange={(value) => handleDeviceChange('video', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {videoInputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Microphone Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Microphone
              </Label>
              <Select
                value={selectedAudioInput}
                onValueChange={(value) => handleDeviceChange('audio', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {audioInputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Audio Level Indicator */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Microphone Level</Label>
                <Progress
                  value={audioLevel}
                  className="h-2"
                  // Green when speaking, gray when quiet
                  style={{
                    '--progress-background': audioLevel > 20 ? '#10b981' : '#6b7280'
                  } as any}
                />
              </div>
            </div>

            {/* Speaker Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                Speakers
              </Label>
              <Select
                value={selectedAudioOutput}
                onValueChange={(value) => handleDeviceChange('output', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select speakers" />
                </SelectTrigger>
                <SelectContent>
                  {audioOutputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Speaker Test */}
              <Button
                size="sm"
                variant="outline"
                onClick={testAudioOutput}
                disabled={isTestingAudio || !selectedAudioOutput}
                className="w-full"
              >
                {isTestingAudio ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Test Speakers
                  </>
                )}
              </Button>
            </div>

            {/* Device Status */}
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Device Status</Label>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {videoEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span>Camera: {videoEnabled ? 'Ready' : 'Disabled'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {audioEnabled ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span>Microphone: {audioEnabled ? 'Ready' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          <Button
            onClick={handleJoinMeeting}
            disabled={isLoading || (!audioEnabled && !videoEnabled)}
            className="min-w-32"
          >
            {isWaitingRoom ? 'Join Waiting Room' : 'Join Meeting'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}