import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * YouTube API service for video metadata
 */
@Injectable()
export class YouTubeApiService {
  private readonly logger = new Logger(YouTubeApiService.name);
  private readonly YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get video metadata
   */
  async getVideoMetadata(videoId: string, apiKey?: string): Promise<{
    title: string;
    duration: number;
    thumbnail: string;
    channelTitle: string;
  } | null> {
    if (!apiKey) {
      this.logger.warn('YouTube API key not provided, skipping metadata fetch');
      return null;
    }

    try {
      const url = `${this.YOUTUBE_API_BASE}/videos`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            id: videoId,
            key: apiKey,
            part: 'snippet,contentDetails',
          },
        }),
      );

      const video = response.data.items?.[0];
      if (!video) {
        return null;
      }

      // Parse duration (ISO 8601 format: PT1H2M10S)
      const duration = this.parseDuration(video.contentDetails.duration);

      return {
        title: video.snippet.title,
        duration,
        thumbnail: video.snippet.thumbnails.default.url,
        channelTitle: video.snippet.channelTitle,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch YouTube video metadata:`, error);
      return null;
    }
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
      return 0;
    }

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Validate video ID format
   */
  isValidVideoId(videoId: string): boolean {
    // YouTube video IDs are 11 characters alphanumeric
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }
}

