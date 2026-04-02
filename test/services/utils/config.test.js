import { jest, describe, it, expect, beforeAll } from "@jest/globals";
import { Config } from "../../../src/index";

describe("Config class", () => {
  beforeAll(() => {
    process.env.NODE_ENV = "test";
    process.env.SERVER_ROOT = "/test/server/root";
    process.env.GLINT_ROOT = "/test/glint/root";
  });

  it("should get a string configuration value", () => {
    expect(Config.get("NODE_ENV")).toEqual("test");
  });

  it("should get a number configuration value", () => {
    process.env.PORT = "3000";
    expect(Config.get("PORT", Number)).toEqual(3000);
  });

  it("should throw an error when forcing non-numeric string to be number", () => {
    process.env.NONNUMERIC_STRING = false;
    expect(() => Config.get("NONNUMERIC_STRING", Number)).toThrowError(
      "Unexpected Number value 'false' for configuration key NONNUMERIC_STRING",
    );
  });

  it("should get a boolean configuration value", () => {
    process.env.MONGODB_DISABLED = "true";
    expect(Config.get("MONGODB_DISABLED", Boolean)).toEqual(true);

    process.env.MONGODB_DISABLED = "false";
    expect(Config.get("MONGODB_DISABLED", Boolean)).toEqual(false);
  });

  it("should throw an error when forcing non-boolean string to be boolean", () => {
    process.env.NONBOOLEAN_STRING = "notbool";
    expect(() => Config.get("NONBOOLEAN_STRING", Boolean)).toThrowError(
      "Unexpected Boolean value 'notbool' for configuration key NONBOOLEAN_STRING",
    );
  });

  it("should throw an error when a required configuration value is missing", () => {
    expect(() => Config.mustGet("MISSING_KEY")).toThrowError("Configuration MISSING_KEY is not set.");
  });

  it("should set a configuration value", () => {
    Config.set("NEW_KEY", "new_value");
    expect(Config.get("NEW_KEY")).toEqual("new_value");
  });

  it("should get the SERVER_ROOT configuration value", () => {
    expect(Config.SERVER_ROOT).toEqual("/test/server/root");
  });

  it("should get the GLINT_ROOT configuration value", () => {
    expect(Config.GLINT_ROOT).toEqual("/test/glint/root");
  });

  it("should get the PORT configuration value", () => {
    process.env.PORT = "3000";
    expect(Config.PORT).toEqual(3000);
  });

  it("should get MONGODB_DISABLED as boolean", () => {
    process.env.MONGODB_DISABLED = "true";
    expect(Config.MONGODB_DISABLED).toBe(true);
  });

  it("should get REGISTRATION_FLOW from GLINT_REGISTRATION_FLOW", () => {
    process.env.GLINT_REGISTRATION_FLOW = "email";
    expect(Config.REGISTRATION_FLOW).toBe("email");
    delete process.env.GLINT_REGISTRATION_FLOW;
  });

  it("should return undefined for null env value", () => {
    expect(Config.get("COMPLETELY_NONEXISTENT_KEY")).toBeUndefined();
  });

  it("should return undefined when getting a non-existent key with Number type", () => {
    delete process.env.UNDEFINED_ENV_VALUE;
    expect(Config.get("UNDEFINED_ENV_VALUE", Number)).toBeUndefined();
  });

  it("should return undefined when getting a non-existent key with Boolean type", () => {
    delete process.env.UNDEFINED_BOOL_VALUE;
    expect(Config.get("UNDEFINED_BOOL_VALUE", Boolean)).toBeUndefined();
  });

  it("should warn when env file is not found during dotenv init", () => {
    const originalServerRoot = process.env.SERVER_ROOT;
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    Config.set("SERVER_ROOT", "/nonexistent/path");

    Config._initDotenv();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Unable to load .env file"));
    warnSpy.mockRestore();
    Config.set("SERVER_ROOT", originalServerRoot);
  });

  it("should use DEFAULT_SERVER_ROOT when set", () => {
    const originalDefault = process.env.DEFAULT_SERVER_ROOT;
    const originalRoot = process.env.SERVER_ROOT;
    process.env.DEFAULT_SERVER_ROOT = "/custom/default/root";

    Config._initAppRoot();

    expect(Config.SERVER_ROOT).toBe("/custom/default/root");
    if (originalDefault) {
      process.env.DEFAULT_SERVER_ROOT = originalDefault;
    } else {
      delete process.env.DEFAULT_SERVER_ROOT;
    }
    Config.set("SERVER_ROOT", originalRoot);
  });

  it("should handle CLOUD_ENV in dotenv file naming", () => {
    const originalServerRoot = process.env.SERVER_ROOT;
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    process.env.CLOUD_ENV = "staging";
    Config.set("SERVER_ROOT", "/nonexistent/path");

    Config._initDotenv();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("test-staging.env"));
    warnSpy.mockRestore();
    delete process.env.CLOUD_ENV;
    Config.set("SERVER_ROOT", originalServerRoot);
  });
});
