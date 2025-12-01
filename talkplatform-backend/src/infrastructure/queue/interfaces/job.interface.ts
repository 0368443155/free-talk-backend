/**
 * Job status
 */
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

/**
 * Job priority
 */
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20,
}

/**
 * Job interface
 */
export interface IJob<T = any> {
  id: string;
  name: string;
  data: T;
  status: JobStatus;
  priority?: JobPriority;
  attempts?: number;
  maxAttempts?: number;
  delay?: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

/**
 * Job options
 */
export interface JobOptions {
  /** Job priority */
  priority?: JobPriority;
  
  /** Delay before processing (milliseconds) */
  delay?: number;
  
  /** Maximum number of attempts */
  attempts?: number;
  
  /** Backoff strategy */
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  
  /** Remove job after completion */
  removeOnComplete?: boolean;
  
  /** Remove job after failure */
  removeOnFail?: boolean;
  
  /** Job timeout (milliseconds) */
  timeout?: number;
}

/**
 * Job processor interface
 */
export interface IJobProcessor<T = any> {
  /**
   * Process the job
   */
  process(job: IJob<T>): Promise<void>;
  
  /**
   * Handle job failure
   */
  onFailed?(job: IJob<T>, error: Error): Promise<void>;
  
  /**
   * Handle job completion
   */
  onCompleted?(job: IJob<T>): Promise<void>;
}

