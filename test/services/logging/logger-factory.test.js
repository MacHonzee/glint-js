import { jest, beforeEach, describe, it, expect } from "@jest/globals";
import { LoggerFactory, Config } from "../../../src/index.js";

jest.spyOn(Config, "get");

describe("LoggerFactory", () => {
  describe("create", () => {
    beforeEach(() => {
      // Reset the logger cache before each test
      LoggerFactory._loggers = {};
    });

    it("returns an existing logger with the same name", () => {
      const logger1 = LoggerFactory.create("test");
      const logger2 = LoggerFactory.create("test");
      expect(logger1).toBe(logger2);
    });

    it("creates a new logger if no existing logger with the same name", () => {
      const logger1 = LoggerFactory.create("test1");
      const logger2 = LoggerFactory.create("test2");
      expect(logger1).not.toBe(logger2);
    });

    it("sets the log level to the value from the environment variable if available", () => {
      Config.get.mockReturnValueOnce("debug");
      const logger = LoggerFactory.create("test");
      expect(logger.level).toBe("debug");
    });

    it("sets the log level to the global value if no specific level is set", () => {
      Config.get.mockReturnValueOnce(null);
      Config.get.mockReturnValueOnce("info");
      const logger = LoggerFactory.create("test");
      expect(logger.level).toBe("info");
    });

    it("sets the log level to the default level if no specific or global level is set", () => {
      Config.get.mockReturnValueOnce(null);
      Config.get.mockReturnValueOnce(null);
      const logger = LoggerFactory.create("test");
      expect(logger.level).toBe("info");
    });
  });
});
