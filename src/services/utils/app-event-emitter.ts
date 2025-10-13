import { EventEmitter } from "events";
import LoggerFactory from "../logging/logger-factory.js";

/**
 * Application-wide event emitter with built-in logging.
 * Provides a centralized event bus for publish-subscribe patterns across the application.
 * All events are automatically logged for debugging and monitoring purposes.
 */
class AppEventEmitter extends EventEmitter {
  private logger = LoggerFactory.create("Service.AppEventEmitter");

  /**
   * Publishes an event to all subscribed listeners.
   * Automatically logs the event emission with its parameters.
   * @param event - The event name to publish
   * @param rest - Additional arguments to pass to event listeners
   */
  publish(event: string | symbol, ...rest: any[]): void {
    this.logger.info(`Emitted event '${String(event)}' with parameters ${rest.join(",")}`);
    this.emit(event, ...rest);
  }

  /**
   * Subscribes to an event with a callback function.
   * Automatically logs the subscription.
   * @param event - The event name to subscribe to
   * @param callback - The callback function to execute when the event is published
   */
  subscribe(event: string | symbol, callback: (...args: any[]) => void): void {
    this.logger.info(`Subscribed to event '${String(event)}' with callback '${callback.name || "anonymous function"}'`);
    this.on(event, callback);
  }
}

export default new AppEventEmitter();
