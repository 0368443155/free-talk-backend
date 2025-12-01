import { Injectable, Logger, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IEvent, IEventHandler, IEventPublisher, IEventSubscriber } from '../interfaces/event.interface';
import { EVENT_HANDLER_KEY } from '../decorators/events-handler.decorator';
import { Reflector } from '@nestjs/core';

@Injectable()
export class EventBusService implements IEventPublisher, IEventSubscriber {
  private readonly logger = new Logger(EventBusService.name);
  private readonly handlers = new Map<string, IEventHandler[]>();

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Publish an event
   */
  async publish<T extends IEvent>(event: T): Promise<void> {
    const eventType = event.type;
    const handlers = this.handlers.get(eventType) || [];

    this.logger.debug(`Publishing event: ${eventType} to ${handlers.length} handlers`);

    // Execute all handlers in parallel
    const promises = handlers.map(handler => {
      return this.executeHandler(handler, event);
    });

    await Promise.allSettled(promises);
  }

  /**
   * Publish multiple events
   */
  async publishAll<T extends IEvent>(events: T[]): Promise<void> {
    await Promise.all(events.map(event => this.publish(event)));
  }

  /**
   * Subscribe to an event type
   */
  subscribe<T extends IEvent>(
    eventType: string,
    handler: IEventHandler<T>,
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler);
    this.logger.log(`Subscribed handler to event: ${eventType}`);
  }

  /**
   * Unsubscribe from an event type
   */
  unsubscribe(eventType: string, handler: IEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) {
      return;
    }

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.logger.log(`Unsubscribed handler from event: ${eventType}`);
    }
  }

  /**
   * Register event handlers from a class
   */
  registerHandlers(handlerClass: Type<IEventHandler>): void {
    const instance = this.moduleRef.get(handlerClass, { strict: false });
    if (!instance) {
      this.logger.warn(`Could not get instance of ${handlerClass.name}`);
      return;
    }

    const eventTypes = this.reflector.get<Type<IEvent>[]>(
      EVENT_HANDLER_KEY,
      handlerClass,
    );

    if (!eventTypes || eventTypes.length === 0) {
      return;
    }

    eventTypes.forEach(eventType => {
      const eventTypeName = new eventType({} as any).type;
      this.subscribe(eventTypeName, instance);
    });
  }

  /**
   * Execute handler with error handling
   */
  private async executeHandler(handler: IEventHandler, event: IEvent): Promise<void> {
    try {
      await handler.handle(event);
    } catch (error) {
      this.logger.error(
        `Error handling event ${event.type}:`,
        error instanceof Error ? error.stack : error,
      );
      // Don't throw - allow other handlers to continue
    }
  }
}

