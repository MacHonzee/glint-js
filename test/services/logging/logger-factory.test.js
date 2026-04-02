import { jest, beforeEach, describe, it, expect } from "@jest/globals";
import Transport from "winston-transport";
import { LoggerFactory, Config } from "../../../src/index.js";
import { truncateLargeEntries, MAX_LOG_ENTRY_SIZE } from "../../../src/services/logging/logger-factory.js";

class CaptureTransport extends Transport {
  constructor(opts = {}) {
    super(opts);
    this.captured = [];
  }
  log(info, callback) {
    this.captured.push(info);
    callback();
  }
}

jest.spyOn(Config, "get");

function runTruncateFormat(info) {
  const format = truncateLargeEntries();
  return format.transform(info, {});
}

describe("truncateLargeEntries", () => {
  it("leaves small messages unchanged", () => {
    const info = { level: "info", message: "Hello world" };
    const result = runTruncateFormat(info);
    expect(result.message).toBe("Hello world");
  });

  it("leaves messages at exactly MAX_LOG_ENTRY_SIZE unchanged", () => {
    const msg = "x".repeat(MAX_LOG_ENTRY_SIZE);
    const info = { level: "info", message: msg };
    const result = runTruncateFormat(info);
    expect(result.message).toBe(msg);
    expect(result.message.length).toBe(MAX_LOG_ENTRY_SIZE);
  });

  it("truncates oversized message and appends truncation notice", () => {
    const originalLength = MAX_LOG_ENTRY_SIZE + 5000;
    const msg = "x".repeat(originalLength);
    const info = { level: "info", message: msg };
    const result = runTruncateFormat(info);
    expect(result.message.length).toBeLessThan(originalLength);
    expect(result.message).toMatch(/\.\.\. \[TRUNCATED from \d+ chars\]$/);
    expect(result.message).toContain(`[TRUNCATED from ${originalLength} chars]`);
    expect(result.message.slice(0, MAX_LOG_ENTRY_SIZE)).toBe("x".repeat(MAX_LOG_ENTRY_SIZE));
  });

  it("leaves small splat objects unchanged", () => {
    const info = { level: "info", message: "test", [Symbol.for("splat")]: [{ foo: "bar" }] };
    const result = runTruncateFormat(info);
    expect(result[Symbol.for("splat")][0]).toEqual({ foo: "bar" });
  });

  it("truncates oversized splat object (non-Error) to string with notice", () => {
    const bigObj = { data: "x".repeat(MAX_LOG_ENTRY_SIZE + 1000) };
    const info = { level: "info", message: "test", [Symbol.for("splat")]: [bigObj] };
    const result = runTruncateFormat(info);
    const splat = result[Symbol.for("splat")][0];
    expect(typeof splat).toBe("string");
    expect(splat).toMatch(/\.\.\. \[TRUNCATED from \d+ chars\]$/);
  });

  it("truncates Error with oversized message when serialization also exceeds limit", () => {
    const hugeMessage = "x".repeat(MAX_LOG_ENTRY_SIZE + 1000);
    const err = new Error(hugeMessage);
    err.code = "ERR_HUGE_MSG";
    err.hugePayload = "y".repeat(MAX_LOG_ENTRY_SIZE + 1000);
    const info = { level: "error", message: "test", [Symbol.for("splat")]: [err] };
    const result = runTruncateFormat(info);
    const safeErr = result[Symbol.for("splat")][0];
    expect(safeErr).toBeInstanceOf(Error);
    expect(safeErr.message).toMatch(/\.\.\. \[TRUNCATED from \d+ chars\]$/);
    expect(safeErr.message.length).toBeLessThan(MAX_LOG_ENTRY_SIZE + 1000);
    expect(safeErr.code).toBe("ERR_HUGE_MSG");
  });

  it("truncates Error with oversized serialization, preserving code and stack", () => {
    // Error with large enumerable property - JSON.stringify includes enumerable props, so it exceeds limit
    const err = new Error("short message");
    err.code = "ERR_CUSTOM";
    err.params = { key: "value" };
    err.hugePayload = "x".repeat(MAX_LOG_ENTRY_SIZE + 5000); // makes JSON.stringify huge
    const info = { level: "error", message: "error occurred", [Symbol.for("splat")]: [err] };
    const result = runTruncateFormat(info);
    const safeErr = result[Symbol.for("splat")][0];
    expect(safeErr).toBeInstanceOf(Error);
    expect(safeErr.message).toBe("short message");
    expect(safeErr.code).toBe("ERR_CUSTOM");
    expect(safeErr.stack).toBe(err.stack);
    expect(safeErr.params).toEqual({ key: "value" });
    // hugePayload is dropped - Error is replaced with safe copy, not the truncated serialized string
    expect(safeErr.hugePayload).toBeUndefined();
  });

  it("truncates Error.params when params JSON exceeds limit", () => {
    const err = new Error("short");
    err.params = { huge: "x".repeat(MAX_LOG_ENTRY_SIZE + 1000) };
    const info = { level: "error", message: "test", [Symbol.for("splat")]: [err] };
    const result = runTruncateFormat(info);
    const safeErr = result[Symbol.for("splat")][0];
    expect(safeErr.params).toEqual({ _truncated: true, originalSize: expect.any(Number) });
  });

  it("replaces unserializable splat with placeholder", () => {
    const circular = {};
    circular.self = circular;
    const info = { level: "info", message: "test", [Symbol.for("splat")]: [circular] };
    const result = runTruncateFormat(info);
    expect(result[Symbol.for("splat")][0]).toBe("[Unserializable object]");
  });

  it("does not mutate info when message is not a string", () => {
    const info = { level: "info", message: 12345 };
    const result = runTruncateFormat(info);
    expect(result.message).toBe(12345);
  });

  it("works correctly when used in a real logger pipeline", () => {
    const captureTransport = new CaptureTransport();
    const logger = LoggerFactory.create("truncate-integration-test");
    logger.add(captureTransport);
    const hugeMsg = "x".repeat(MAX_LOG_ENTRY_SIZE + 10000);
    logger.info(hugeMsg);
    expect(captureTransport.captured).toHaveLength(1);
    expect(captureTransport.captured[0].message).toMatch(/\.\.\. \[TRUNCATED from \d+ chars\]$/);
    expect(captureTransport.captured[0].message.length).toBeLessThan(hugeMsg.length);
  });
});

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

    it("adds Google Cloud transport in production mode", () => {
      Config.get.mockReturnValueOnce(null);
      Config.get.mockReturnValueOnce(null);
      jest.spyOn(Config, "NODE_ENV", "get").mockReturnValue("production");

      const logger = LoggerFactory.create("production-mode-test");
      expect(logger.transports.length).toBe(2);
    });

    it("uses explicit level parameter over environment config", () => {
      const logger = LoggerFactory.create("explicit-level-test", "warn");
      expect(logger.level).toBe("warn");
    });
  });
});
