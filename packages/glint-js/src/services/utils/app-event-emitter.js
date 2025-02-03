import { EventEmitter } from "events";
import LoggerFactory from "../logging/logger-factory.js";

class AppEventEmitter extends EventEmitter {
  logger = LoggerFactory.create("Service.AppEventEmitter");

  publish(event, ...rest) {
    this.logger.info(`Emitted event '${event}' with parameters ${rest}`);
    this.emit(event, ...rest);
  }

  subscribe(event, callback) {
    this.logger.info(`Subscribed to event '${event}' with callback '${callback.name || "anonymous function"}'`);
    this.on(event, callback);
  }
}

export default new AppEventEmitter();
