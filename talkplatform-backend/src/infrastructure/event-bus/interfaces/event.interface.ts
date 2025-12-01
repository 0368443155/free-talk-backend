/**
 * Base event interface
 */
export interface IEvent {
  /** Event ID */
  id: string;
  
  /** Event type/name */
  type: string;
  
  /** Timestamp when event occurred */
  timestamp: Date;
  
  /** Event payload/data */
  payload: Record<string, any>;
  
  /** Event metadata */
  metadata?: Record<string, any>;
}

/**
 * Event handler interface
 */
export interface IEventHandler<T extends IEvent = IEvent> {
  /**
   * Handle the event
   */
  handle(event: T): Promise<void>;
}

/**
 * Event publisher interface
 */
export interface IEventPublisher {
  /**
   * Publish an event
   */
  publish<T extends IEvent>(event: T): Promise<void>;
  
  /**
   * Publish multiple events
   */
  publishAll<T extends IEvent>(events: T[]): Promise<void>;
}

/**
 * Event subscriber interface
 */
export interface IEventSubscriber {
  /**
   * Subscribe to an event type
   */
  subscribe<T extends IEvent>(
    eventType: string,
    handler: IEventHandler<T>,
  ): void;
  
  /**
   * Unsubscribe from an event type
   */
  unsubscribe(eventType: string, handler: IEventHandler<T>): void;
}

