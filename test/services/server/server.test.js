import { describe, beforeAll, it, expect, afterAll } from "@jest/globals";
import TestService from "../../test-utils/test-service.js";

describe("Server", () => {
  beforeAll(async () => {
    await TestService.startServer();
  });

  afterAll(async () => {
    await TestService.stopServer();
  });

  it("should return success for sys/ping", async () => {
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

  it.todo("should return success for testcase/hello");

  it.todo("should pass authentication for non-public route");

  it.todo("should pass authorization for non-public route");

  it.todo("should accept file");

  it.todo("should return file");

  it.todo("should throw CORS error");
});
