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

    // Track YouTube-related network requests using Performance API
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
          const duration = resourceEntry.duration || 0;

          if (transferSize > 0) {
            setMetrics((prev) => ({
              ...prev,
              totalBytesDownloaded: prev.totalBytesDownloaded + transferSize,
              isActive: true,
            }));

            // Calculate bitrate if we have duration
            if (duration > 0) {
              const bitrate = (transferSize * 8) / (duration / 1000); // kbps
              setMetrics((prev) => ({
                ...prev,
                downloadBitrate: Math.round(bitrate),
              }));
            }
          }
        }
      }
    });

    // Observe resource timing entries
    try {
      observer.observe({ entryTypes: ['resource'] });
      observerRef.current = observer;
    } catch (error) {
      console.error('❌ [YouTube] Failed to create PerformanceObserver:', error);
    }

    // Calculate bitrate periodically from total bytes
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - previousTimeRef.current) / 1000; // seconds

      setMetrics((prev) => {
        if (timeDiff > 0 && prev.totalBytesDownloaded > previousBytesRef.current) {
          const bytesDiff = prev.totalBytesDownloaded - previousBytesRef.current;
          const bitrate = (bytesDiff * 8) / timeDiff; // kbps

          previousBytesRef.current = prev.totalBytesDownloaded;
          previousTimeRef.current = now;

          return {
            ...prev,
            downloadBitrate: Math.round(bitrate),
          };
        }
        return prev;
      });
    }, 2000); // Update every 2 seconds

    // Try to get video quality from YouTube player (if available)
    const checkQuality = () => {
      if (typeof window !== 'undefined' && (window as any).YT) {
        try {
          // This is a best-effort approach - YouTube API doesn't always expose quality
          // We'll infer from bitrate ranges
          setMetrics((prev) => {
            let quality = 'auto';
            if (prev.downloadBitrate > 0) {
              if (prev.downloadBitrate < 100) quality = '144p';
              else if (prev.downloadBitrate < 300) quality = '240p';
              else if (prev.downloadBitrate < 500) quality = '360p';
              else if (prev.downloadBitrate < 1000) quality = '480p';
              else if (prev.downloadBitrate < 2500) quality = '720p';
              else quality = '1080p';
            }
            return { ...prev, quality };
          });
        } catch (error) {
          // Silently fail - quality detection is optional
        }
      }
    };

    const qualityInterval = setInterval(checkQuality, 5000);

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
      previousBytesRef.current = 0;
      previousTimeRef.current = Date.now();
      bufferingCountRef.current = 0;
    };
  }, [videoId]);

  return metrics;
}

