import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { IJob, JobOptions, JobPriority } from '../interfaces/job.interface';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();

  /**
   * Register a queue
   */
  registerQueue(name: string, queue: Queue): void {
    this.queues.set(name, queue);
    this.logger.log(`Queue ${name} registered`);
  }

  /**
   * Get queue by name
   */
  getQueue(name: string): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue ${name} not found`);
    }
    return queue;
  }

  /**
   * Add job to queue
   */
  async addJob<T>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions,
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    
    const jobOptions: any = {
      ...options,
      priority: options?.priority || JobPriority.NORMAL,
    };

    const job = await queue.add(jobName, data, jobOptions);
    this.logger.log(`Job ${job.id} added to queue ${queueName}`);
    
    return job;
  }

  /**
   * Get job by ID
   */
  async getJob<T>(queueName: string, jobId: string): Promise<Job<T> | null> {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId);
  }

  /**
   * Get job state
   */
  async getJobState(queueName: string, jobId: string): Promise<string | null> {
    const job = await this.getJob(queueName, jobId);
    if (!job) {
      return null;
    }
    return job.getState();
  }

  /**
   * Remove job
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Job ${jobId} removed from queue ${queueName}`);
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.retry();
      this.logger.log(`Job ${jobId} retried in queue ${queueName}`);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getPausedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.log(`Queue ${queueName} paused`);
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }

  /**
   * Clean queue (remove old jobs)
   */
  async cleanQueue(
    queueName: string,
    grace: number = 1000,
    limit: number = 100,
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(grace, limit);
    this.logger.log(`Queue ${queueName} cleaned`);
  }
}

