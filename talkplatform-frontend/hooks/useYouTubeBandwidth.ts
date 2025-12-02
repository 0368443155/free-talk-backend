import { useEffect, useRef, useState } from 'react';

export interface YouTubeBandwidthMetrics {
  downloadBitrate: number; // kbps
  quality: string; // '144p' | '240p' | '360p' | '480p' | '720p' | '1080p' | 'auto'
  totalBytesDownloaded: number;
  bufferingEvents: number;
  isActive: boolean;
}

interface PerformanceResourceEntry extends PerformanceEntry {
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
  duration?: number;
}

export function useYouTubeBandwidth(videoId: string | null | undefined) {
  const [metrics, setMetrics] = useState<YouTubeBandwidthMetrics>({
    downloadBitrate: 0,
    quality: 'auto',
    totalBytesDownloaded: 0,
    bufferingEvents: 0,
    isActive: false,
  });

  const previousBytesRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(Date.now());
  const bufferingCountRef = useRef<number>(0);
  const observerRef = useRef<PerformanceObserver | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!videoId) {
      // Reset metrics when no video
      setMetrics({
        downloadBitrate: 0,
        quality: 'auto',
        totalBytesDownloaded: 0,
        bufferingEvents: 0,
        isActive: false,
      });
      return;
    }

    console.log('📺 [YouTube] Starting bandwidth monitoring for video:', videoId);
    
    // Debug: Check if Performance API is available
    if (typeof window !== 'undefined' && !window.performance) {
      console.warn('⚠️ [YouTube] Performance API not available');
    }

    // Track YouTube-related network requests using Performance API
    // Also get all existing entries to track ongoing streams
    const getAllYouTubeEntries = () => {
      if (typeof window === 'undefined' || !window.performance) return;
      
      const entries = window.performance.getEntriesByType('resource') as PerformanceResourceEntry[];
      let totalBytes = 0;
      
      for (const entry of entries) {
        const url = entry.name;
        if (
          url.includes('youtube.com') ||
          url.includes('googlevideo.com') ||
          url.includes('ytimg.com')
        ) {
          const transferSize = entry.transferSize || entry.encodedBodySize || 0;
          if (transferSize > 0) {
            totalBytes += transferSize;
          }
        }
      }
      
      if (totalBytes > 0) {
        setMetrics((prev) => ({
          ...prev,
          totalBytesDownloaded: totalBytes,
          isActive: true,
        }));
        previousBytesRef.current = totalBytes;
      }
    };
    
    // Get initial entries
    getAllYouTubeEntries();
    
    // Track new YouTube-related network requests using Performance API
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceEntry;
        const url = resourceEntry.name;

        // Check if this is a YouTube video request
        if (
          url.includes('youtube.com') ||
          url.includes('googlevideo.com') ||
          url.includes('ytimg.com')
        ) {
          const transferSize = resourceEntry.transferSize || resourceEntry.encodedBodySize || 0;

          if (transferSize > 0) {
            console.log('📺 [YouTube] Detected new request:', {
              url: url.substring(0, 100),
              transferSize,
            });
            
            setMetrics((prev) => ({
              ...prev,
              totalBytesDownloaded: prev.totalBytesDownloaded + transferSize,
              isActive: true,
            }));
          }
        }
      }
      
      // Also refresh total bytes from all entries
      getAllYouTubeEntries();
    });

    // Observe resource timing entries
    try {
      observer.observe({ entryTypes: ['resource'] });
      observerRef.current = observer;
      console.log('✅ [YouTube] PerformanceObserver created');
    } catch (error) {
      console.error('❌ [YouTube] Failed to create PerformanceObserver:', error);
    }
    
    // Also refresh all entries periodically to catch ongoing streams
    refreshIntervalRef.current = setInterval(() => {
      getAllYouTubeEntries();
    }, 3000); // Refresh every 3 seconds

    // Calculate bitrate periodically from total bytes (REAL-TIME)
    // This is the main real-time tracking mechanism
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - previousTimeRef.current) / 1000; // seconds

      // Refresh total bytes from all entries first
      getAllYouTubeEntries();

      setMetrics((prev) => {
        // Always update, even if no new bytes (to show real-time changes)
        if (timeDiff > 0 && prev.isActive) {
          if (prev.totalBytesDownloaded > previousBytesRef.current) {
            // Calculate bitrate from delta
            const bytesDiff = prev.totalBytesDownloaded - previousBytesRef.current;
            const bitrate = (bytesDiff * 8) / timeDiff; // kbps
            
            console.log('📺 [YouTube] Bitrate update:', {
              bytesDiff,
              timeDiff: timeDiff.toFixed(2),
              bitrate: Math.round(bitrate),
              totalBytes: prev.totalBytesDownloaded,
            });
            
            previousBytesRef.current = prev.totalBytesDownloaded;
            previousTimeRef.current = now;

            return {
              ...prev,
              downloadBitrate: Math.round(bitrate),
              isActive: true,
            };
          } else {
            // No new bytes - might be paused or buffered
            // Keep last bitrate for a short time, then set to 0
            previousTimeRef.current = now;
            // If bitrate was high before, keep it (video might be buffered)
            if (prev.downloadBitrate > 100) {
              return prev; // Keep last bitrate
            }
            return {
              ...prev,
              downloadBitrate: 0, // No activity
            };
          }
        }
        return prev;
      });
    }, 2000); // Update every 2 seconds for real-time tracking

    // Try to get video quality from YouTube player (if available)
    // Also estimate bitrate from quality level
    const checkQuality = () => {
      if (typeof window !== 'undefined' && (window as any).YT) {
        try {
          // Find YouTube iframe and try to get quality
          const iframes = document.querySelectorAll('iframe[src*="youtube.com"]');
          if (iframes.length > 0) {
            // YouTube quality to bitrate mapping (approximate)
            const qualityBitrateMap: Record<string, number> = {
              'tiny': 100,      // 144p
              'small': 300,     // 240p
              'medium': 500,    // 360p
              'large': 1000,    // 480p
              'hd720': 2500,    // 720p
              'hd1080': 5000,   // 1080p
              'highres': 8000,  // 4K
            };
            
            setMetrics((prev) => {
              let quality = 'auto';
              let estimatedBitrate = prev.downloadBitrate;
              
              // Infer quality from bitrate if we have it
              if (prev.downloadBitrate > 0) {
                if (prev.downloadBitrate < 100) quality = '144p';
                else if (prev.downloadBitrate < 300) quality = '240p';
                else if (prev.downloadBitrate < 500) quality = '360p';
                else if (prev.downloadBitrate < 1000) quality = '480p';
                else if (prev.downloadBitrate < 2500) quality = '720p';
                else if (prev.downloadBitrate < 5000) quality = '1080p';
                else quality = '4K';
              }
              
              // If bitrate is 0 but we're active, use estimated from quality
              if (prev.isActive && prev.downloadBitrate === 0 && quality !== 'auto') {
                const qualityKey = quality.replace('p', '').toLowerCase();
                estimatedBitrate = qualityBitrateMap[qualityKey] || 1000;
              }
              
              return { 
                ...prev, 
                quality,
                downloadBitrate: estimatedBitrate > 0 ? estimatedBitrate : prev.downloadBitrate,
              };
            });
          }
        } catch (error) {
          // Silently fail - quality detection is optional
        }
      }
    };

    const qualityInterval = setInterval(checkQuality, 2000); // Check every 2 seconds

    // Detect buffering events (simplified - track when bitrate drops significantly)
    let lastBitrate = 0;
    const bufferingCheck = setInterval(() => {
      setMetrics((prev) => {
        if (prev.downloadBitrate < lastBitrate * 0.3 && prev.downloadBitrate > 0 && lastBitrate > 100) {
          // Significant drop in bitrate might indicate buffering
          bufferingCountRef.current += 1;
          return {
            ...prev,
            bufferingEvents: bufferingCountRef.current,
          };
        }
        lastBitrate = prev.downloadBitrate;
        return prev;
      });
    }, 3000);

    return () => {
      console.log('📺 [YouTube] Stopping bandwidth monitoring');
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearInterval(qualityInterval);
      clearInterval(bufferingCheck);
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      previousBytesRef.current = 0;
      previousTimeRef.current = Date.now();
      bufferingCountRef.current = 0;
    };
  }, [videoId]);

  return metrics;
}

