import { IEvent, IEventHandler } from './event.interface';

/**
 * Event handler metadata
 */
export interface EventHandlerMetadata {
  eventType: string;
  handler: IEventHandler;
  priority?: number;
}

/**
 * Event handler decorator metadata
 */
export const EVENT_HANDLER_METADATA = 'event-handler';

/**
 * Event handler registration
 */
export interface EventHandlerRegistration {
  eventType: string;
  handlerClass: new (...args: any[]) => IEventHandler;
  methodName: string;
}

