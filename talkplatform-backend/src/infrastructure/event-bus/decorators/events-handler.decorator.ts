import { SetMetadata } from '@nestjs/common';
import { IEvent } from '../interfaces/event.interface';

export const EVENT_HANDLER_KEY = 'event-handler';

/**
 * Decorator to mark a class method as an event handler
 */
export const EventsHandler = <T extends IEvent = IEvent>(...eventTypes: (new (...args: any[]) => T)[]) =>
  SetMetadata(EVENT_HANDLER_KEY, eventTypes);

