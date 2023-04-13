import { describe, it, expect } from "@jest/globals";
import TestService from "../../test-utils/test-service.js";

describe("sys/ping", () => {
  it("should respond 200", async () => {
    const response = await TestService.callGet("sys/ping", { hello: "world" });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      status: "OK",
      version: "1.0.3",
      ts: expect.any(String),
      nodeEnv: "test",
      cloudEnv: undefined,
      buildTs: undefined,
      dtoIn: { hello: "world" },
    });
  });
});
