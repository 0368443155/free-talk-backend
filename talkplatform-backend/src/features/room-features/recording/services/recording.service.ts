import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recording, RecordingStatus, RecordingQuality } from '../entities/recording.entity';
import { ConfigService } from '@nestjs/config';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';
import { BaseRoomGateway } from '../../../../core/room/gateways/base-room.gateway';
import { RoomFactoryService } from '../../../../core/room/services/room-factory.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);

  constructor(
    @InjectRepository(Recording)
    private readonly recordingRepository: Repository<Recording>,
    private readonly configService: ConfigService,
    private readonly roomFactory: RoomFactoryService,
  ) {}

  /**
   * Start recording a room
   */
  async startRecording(
    roomId: string,
    roomType: string,
    livekitRoomName: string,
    userId: string,
    quality: RecordingQuality = RecordingQuality.MEDIUM,
  ): Promise<Recording> {
    this.logger.log(`Starting recording for room ${roomId}`);

    // Check if room supports recording
    const roomConfig = this.roomFactory.getRoomConfigByType(roomType as any);
    if (!roomConfig.features.includes(RoomFeature.RECORDING)) {
      throw new BadRequestException('Recording is not enabled for this room type');
    }

    // Check if there's already an active recording
    const activeRecording = await this.recordingRepository.findOne({
      where: {
        roomId,
        status: RecordingStatus.RECORDING,
      },
    });

    if (activeRecording) {
      throw new BadRequestException('Recording is already in progress for this room');
    }

    try {
      // Create recording record
      const recording = this.recordingRepository.create({
        id: uuidv4(),
        roomId,
        roomType,
        livekitRoomName,
        initiatedById: userId,
        status: RecordingStatus.STARTING,
        quality,
        startedAt: new Date(),
        metadata: {
          participants: [],
          chatMessages: 0,
          features: [],
        },
      });

      await this.recordingRepository.save(recording);

      // TODO: Start LiveKit Egress
      // This would require LiveKit Egress client setup
      // For now, we'll mark it as recording
      recording.status = RecordingStatus.RECORDING;
      await this.recordingRepository.save(recording);

      this.logger.log(`Recording started: ${recording.id}`);

      return recording;
    } catch (error) {
      this.logger.error(`Failed to start recording: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(recordingId: string, userId: string): Promise<Recording> {
    this.logger.log(`Stopping recording ${recordingId}`);

    const recording = await this.recordingRepository.findOne({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Verify user has permission (initiator or host)
    if (recording.initiatedById !== userId) {
      throw new BadRequestException('Only the recording initiator can stop the recording');
    }

    if (recording.status !== RecordingStatus.RECORDING) {
      throw new BadRequestException('Recording is not in progress');
    }

    try {
      // TODO: Stop LiveKit Egress
      // await this.egressClient.stopEgress(recording.egressId);

      // Update status
      recording.status = RecordingStatus.PROCESSING;
      recording.endedAt = new Date();

      // Calculate duration
      if (recording.startedAt) {
        recording.durationSeconds = Math.floor(
          (recording.endedAt.getTime() - recording.startedAt.getTime()) / 1000,
        );
      }

      await this.recordingRepository.save(recording);

      // TODO: Queue for post-processing
      // await this.recordingQueue.add('process-recording', { recordingId: recording.id });

      this.logger.log(`Recording stopped: ${recordingId}`);

      return recording;
    } catch (error) {
      this.logger.error(`Failed to stop recording: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle recording completion webhook from LiveKit
   */
  async handleRecordingCompleted(egressId: string, fileUrl: string): Promise<void> {
    this.logger.log(`Recording completed: ${egressId}`);

    const recording = await this.recordingRepository.findOne({
      where: { egressId },
    });

    if (!recording) {
      this.logger.warn(`Recording not found for egress ${egressId}`);
      return;
    }

    // Update recording
    recording.fileUrl = fileUrl;
    recording.fileName = fileUrl.split('/').pop();
    recording.status = RecordingStatus.COMPLETED;

    // Calculate duration
    if (recording.startedAt && recording.endedAt) {
      recording.durationSeconds = Math.floor(
        (recording.endedAt.getTime() - recording.startedAt.getTime()) / 1000,
      );
    }

    await this.recordingRepository.save(recording);

    // TODO: Queue for post-processing
    // await this.recordingQueue.add('process-recording', { recordingId: recording.id });

    this.logger.log(`Recording completed and queued for processing: ${recording.id}`);
  }

  /**
   * Get recording by ID
   */
  async getRecording(recordingId: string): Promise<Recording> {
    const recording = await this.recordingRepository.findOne({
      where: { id: recordingId },
      relations: ['initiatedBy'],
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    return recording;
  }

  /**
   * Get recordings for a room
   */
  async getRoomRecordings(roomId: string): Promise<Recording[]> {
    return this.recordingRepository.find({
      where: { roomId },
      order: { createdAt: 'DESC' },
      relations: ['initiatedBy'],
    });
  }

  /**
   * Get user's recordings
   */
  async getUserRecordings(userId: string): Promise<Recording[]> {
    return this.recordingRepository.find({
      where: { initiatedById: userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string, userId: string): Promise<void> {
    const recording = await this.getRecording(recordingId);

    // Verify permission
    if (recording.initiatedById !== userId) {
      throw new BadRequestException('Only the recording owner can delete it');
    }

    // TODO: Delete file from S3
    // await this.storageService.deleteFile(recording.fileUrl);

    // Delete from database
    await this.recordingRepository.delete(recordingId);

    this.logger.log(`Recording deleted: ${recordingId}`);
  }
}

