import { describe, beforeAll, it, expect, afterAll } from "@jest/globals";
import { FormData, fileFromSync } from "node-fetch";
import TestService from "../../test-utils/test-service.js";
import AssertionService from "../../test-utils/assertion-service.js";

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

  it("should return success for testcase/public", async () => {
    const response = await TestService.callPost("testcase/public");
    console.log("-> response", response);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      hello: "world",
    });
  });

  it("should pass authentication for non-public route", async () => {
    const TestUsers = (await import("../../test-utils/test-users.js")).default;
    const trader = await TestUsers.trader();
    const response = await TestService.callPost("testcase/authenticated", null, trader);
    console.log("-> response", response);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      hello: "authenticated world",
      user: {
        id: expect.any(String),
        firstName: trader.user.firstName,
        lastName: trader.user.lastName,
        username: trader.user.username,
      },
    });
  });

  it("should not pass authentication because of missing authorization token", async () => {
    await AssertionService.assertCallThrows(
      () => TestService.callPost("testcase/authenticated"),
      (e) => {
        expect(e.data).toEqual({
          code: "glint-js/userNotAuthenticated",
          message: "User is not authenticated.",
          params: {
            cause: "Header 'authorization' was not found.",
          },
          trace: expect.any(String),
        });
      },
    );
  });

  it("should pass authorization for non-public route", async () => {
    const TestUsers = (await import("../../test-utils/test-users.js")).default;
    const client = await TestUsers.client();
    const response = await TestService.callPost("testcase/authorized", null, client);
    console.log("-> response", response);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      hello: "authorized world",
      authorizationResult: {
        username: client.user.username,
        authorized: true,
        useCaseRoles: ["Admin", "Client"],
        userRoles: ["Client"],
      },
    });
  });

  it("should not pass authorization because of missing role", async () => {
    const TestUsers = (await import("../../test-utils/test-users.js")).default;
    const authority = await TestUsers.authority();

    await AssertionService.assertCallThrows(
      () => TestService.callPost("testcase/authorized", null, authority),
      (e) => {
        expect(e.data).toEqual({
          code: "glint-js/userNotAuthorized",
          message: "User is not authorized for given route.",
          params: {
            authorized: false,
            useCaseRoles: ["Admin", "Client"],
            userRoles: ["Authority"],
            username: authority.user.username,
          },
          trace: expect.any(String),
        });
      },
    );
  });

  it("should accept file", async () => {
    const formData = new FormData();
    formData.append("code", "testFileCode");
    formData.append("description", "This should be a non-malformed description");
    formData.append("number", 123);
    formData.append("bool", true);

    const fileBlob = fileFromSync("./test/services/server/test-file.txt", "text/plain");
    formData.append("data", fileBlob);

    const response = await TestService.callPost("testcase/acceptFile", formData, null, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log("-> response", response);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      metadata: {
        code: formData.get("code"),
        description: formData.get("description"),
        number: formData.get("number"),
        bool: formData.get("bool"),
      },
      file: {
        name: "test-file.txt",
        length: 42,
        body: "Hello, this is content from my test file.\n",
        mimetype: "text/plain",
      },
    });
  });

  it.todo("should return file");

  it.todo("should throw CORS error");
});
