import { Injectable, Logger } from '@nestjs/common';
import { MediaSettings, MediaQualitySettings } from '../interfaces';

@Injectable()
export class MediaSettingsService {
  private readonly logger = new Logger(MediaSettingsService.name);
  private readonly userSettings = new Map<string, MediaSettings>(); // userId -> settings

  /**
   * Get user media settings
   */
  getSettings(userId: string): MediaSettings | null {
    return this.userSettings.get(userId) || null;
  }

  /**
   * Update user media settings
   */
  updateSettings(userId: string, settings: Partial<MediaSettings>): void {
    const current = this.userSettings.get(userId) || {
      audioEnabled: true,
      videoEnabled: true,
    };

    this.userSettings.set(userId, {
      ...current,
      ...settings,
    });

    this.logger.log(`Media settings updated for user ${userId}`);
  }

  /**
   * Get default quality settings
   */
  getDefaultQualitySettings(): MediaQualitySettings {
    return {
      resolution: 'high',
      frameRate: 30,
      bitrate: 2500,
      audioQuality: 'high',
    };
  }

  /**
   * Get quality settings for bandwidth
   */
  getQualitySettingsForBandwidth(bandwidth: number): MediaQualitySettings {
    if (bandwidth < 500) {
      return {
        resolution: 'low',
        frameRate: 15,
        bitrate: 500,
        audioQuality: 'low',
      };
    } else if (bandwidth < 1000) {
      return {
        resolution: 'medium',
        frameRate: 24,
        bitrate: 1000,
        audioQuality: 'medium',
      };
    } else {
      return this.getDefaultQualitySettings();
    }
  }
}

