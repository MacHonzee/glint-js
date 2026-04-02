import { EventEmitter } from "events";
import LoggerFactory from "../logging/logger-factory.js";

/**
 * Application-level event bus built on Node.js `EventEmitter`. Adds logging
 * for every published and subscribed event.
 *
 * @extends EventEmitter
 */
class AppEventEmitter extends EventEmitter {
  logger = LoggerFactory.create("Service.AppEventEmitter");

  /**
   * Emits an event with the given arguments and logs the emission.
   *
   * @param {string} event - Event name.
   * @param {...*} rest - Arguments forwarded to listeners.
   */
  publish(event, ...rest) {
    this.logger.info(`Emitted event '${event}' with parameters ${rest}`);
    this.emit(event, ...rest);
  }

  /**
   * Subscribes a callback to the given event and logs the subscription.
   *
   * @param {string} event - Event name.
   * @param {Function} callback
   */
  subscribe(event, callback) {
    this.logger.info(`Subscribed to event '${event}' with callback '${callback.name || "anonymous function"}'`);
    this.on(event, callback);
  }
}

export default new AppEventEmitter();
