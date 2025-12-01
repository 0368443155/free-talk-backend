import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';

export interface RecordingJobData {
  roomId: string;
  startTime: Date;
  duration: number;
  recordingUrl?: string;
}

@Processor('recording')
export class RecordingProcessor {
  private readonly logger = new Logger(RecordingProcessor.name);

  @Process('process')
  async handleProcessRecording(job: Job<RecordingJobData>) {
    const { roomId, startTime, duration, recordingUrl } = job.data;

    this.logger.log(`Processing recording job ${job.id} for room ${roomId}`);

    try {
      // TODO: Implement recording processing logic
      // Example: await this.recordingService.process(roomId, startTime, duration, recordingUrl);
      
      this.logger.log(`Recording processed successfully for room ${roomId}`);
    } catch (error) {
      this.logger.error(`Failed to process recording for room ${roomId}:`, error);
      throw error;
    }
  }

  @Process('upload')
  async handleUploadRecording(job: Job<RecordingJobData>) {
    const { roomId, recordingUrl } = job.data;

    this.logger.log(`Uploading recording job ${job.id} for room ${roomId}`);

    try {
      // TODO: Implement recording upload logic
      // Example: await this.storageService.uploadRecording(roomId, recordingUrl);
      
      this.logger.log(`Recording uploaded successfully for room ${roomId}`);
    } catch (error) {
      this.logger.error(`Failed to upload recording for room ${roomId}:`, error);
      throw error;
    }
  }
}

