import { describe, beforeAll, it, expect, afterAll } from "@jest/globals";
import { FormData, fileFromSync } from "node-fetch";
import { TestService, AssertionService } from "../../../src/test-utils/index.js";
import TestUsers from "../../test-utils/test-users.js";

describe("Server", () => {
  beforeAll(async () => {
    await TestService.startServer("./test/test-app/app.js");
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

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      hello: "world",
    });
  });

  it("should pass authentication for non-public route", async () => {
    const authority = await TestUsers.authority();
    const response = await TestService.callPost("testcase/authenticated", null, authority);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      hello: "authenticated world",
      user: {
        id: expect.any(String),
        firstName: authority.user.firstName,
        lastName: authority.user.lastName,
        username: authority.user.username,
      },
    });
  });

  it("should not pass authentication because of missing authorization token", async () => {
    await AssertionService.assertCallThrows(
      () => TestService.callPost("testcase/authenticated"),
      (e) => {
        expect(e.data).toEqual({
          timestamp: expect.any(String),
          code: "glint-js/userNotAuthenticated",
          message: "User is not authenticated.",
          params: {
            cause: "Header 'authorization' was not found.",
          },
          trace: expect.any(String),
          uri: expect.any(String),
        });
      },
    );
  });

  it("should pass authorization for non-public route", async () => {
    const authority = await TestUsers.authority();
    const response = await TestService.callPost("testcase/authorized", null, authority);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      hello: "authorized world",
      authorizationResult: {
        username: authority.user.username,
        authorized: true,
        useCaseRoles: ["Authority"],
        userRoles: ["Authority"],
        useCase: "/testcase/authorized",
      },
    });
  });

  it("should not pass authorization because of missing role", async () => {
    const admin = await TestUsers.admin();

    await AssertionService.assertCallThrows(
      () => TestService.callPost("testcase/authorized", null, admin),
      (e) => {
        expect(e.data).toEqual({
          timestamp: expect.any(String),
          code: "glint-js/userNotAuthorized",
          message: "User is not authorized for given route.",
          params: {
            authorized: false,
            useCaseRoles: ["Authority"],
            userRoles: ["Admin"],
            username: admin.user.username,
            useCase: "/testcase/authorized",
          },
          trace: expect.any(String),
          uri: expect.any(String),
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

  it.todo("should register custom middleware");

  it.todo("should not register middleware because it does not have ORDER");

  it.todo("should not register middleware because it has duplicit ORDER");

  it.todo("should not register middleware because it wrong parameter count");

  it.todo("should not register middleware because it does not have process method");
});
