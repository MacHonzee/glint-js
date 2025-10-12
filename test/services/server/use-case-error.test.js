import { describe, it, expect } from "@jest/globals";
import { UseCaseError } from "../../../src/index";

describe("UseCaseError", () => {
  it("should create an instance of UseCaseError", () => {
    const error = new UseCaseError("Error message", { param1: "value1" }, 400);

    expect(error).toBeInstanceOf(UseCaseError);
  });

  it("should set the message, code, params and status properties correctly", () => {
    const error = new UseCaseError("Error message", { param1: "value1" }, 404);

    expect(error.message).toEqual("Error message");
    expect(error.code).toEqual("glint-js/useCaseError");
    expect(error.params).toEqual({ param1: "value1" });
    expect(error.status).toEqual(404);
  });
});
