import { describe, it, expect, beforeAll } from "@jest/globals";
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
});
