import { describe, it, expect } from "@jest/globals";
import UseCaseError from "../../src/server/use-case-error.js";

describe("UseCaseError", () => {
  it("should create error with default status", () => {
    const error = new UseCaseError("Test error", "test/error", { param: "value" });
    
    expect(error).toMatchObject({
      message: "Test error",
      code: "glint-js/test/error",
      params: { param: "value" },
      status: 400
    });
  });

  it("should create error with custom status", () => {
    const error = new UseCaseError("Not found", "not/found", null, 404);
    
    expect(error).toMatchObject({
      message: "Not found",
      code: "glint-js/not/found",
      params: null,
      status: 404
    });
  });

  it("should be instance of Error", () => {
    const error = new UseCaseError("Test error", "test/error");
    expect(error).toBeInstanceOf(Error);
  });
}); 