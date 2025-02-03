import { jest, describe, it, expect } from "@jest/globals";
import { AppEventEmitter } from "../../../src/index";

jest.spyOn(AppEventEmitter.logger, "info");

// Authored by ChatGPT
describe("AppEventEmitter", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("publish", () => {
    it("should emit the event with the correct parameters", () => {
      const callback = jest.fn();
      AppEventEmitter.on("my-event", callback);
      AppEventEmitter.publish("my-event", "param1", "param2");
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith("param1", "param2");
    });

    it("should log the emitted event", () => {
      AppEventEmitter.publish("my-event", "param1", "param2");
      expect(AppEventEmitter.logger.info).toHaveBeenCalledTimes(1);
      expect(AppEventEmitter.logger.info).toHaveBeenCalledWith(
        "Emitted event 'my-event' with parameters param1,param2",
      );
    });
  });

  describe("subscribe", () => {
    it("should subscribe to the event with the correct callback", () => {
      const callback = jest.fn();
      AppEventEmitter.subscribe("my-event", callback);
      expect(AppEventEmitter.listeners("my-event")).toContain(callback);
    });

    it("should log the subscribed event", () => {
      const callback = jest.fn();
      AppEventEmitter.subscribe("my-event", callback);
      expect(AppEventEmitter.logger.info).toHaveBeenCalledTimes(1);
      expect(AppEventEmitter.logger.info).toHaveBeenCalledWith(
        `Subscribed to event 'my-event' with callback '${callback.name}'`,
      );
    });

    it("should log the subscribed event as anonymous function", () => {
      AppEventEmitter.subscribe("my-event", () => {});
      expect(AppEventEmitter.logger.info).toHaveBeenCalledTimes(1);
      expect(AppEventEmitter.logger.info).toHaveBeenCalledWith(
        `Subscribed to event 'my-event' with callback 'anonymous function'`,
      );
    });
  });
});
