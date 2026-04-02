import { describe, beforeAll, it, expect, afterAll } from "@jest/globals";
import { FormData, fileFromSync } from "node-fetch";
import { TestService, AssertionService } from "../../../src/test-utils/index.js";
import Server from "../../../src/services/server/server.js";

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
    const TestUsers = (await import("../../test-utils/test-users.js")).default;
    const trader = await TestUsers.trader();
    const response = await TestService.callPost("testcase/authenticated", null, trader);

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
    const TestUsers = (await import("../../test-utils/test-users.js")).default;
    const client = await TestUsers.client();
    const response = await TestService.callPost("testcase/authorized", null, client);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      hello: "authorized world",
      authorizationResult: {
        username: client.user.username,
        authorized: true,
        useCaseRoles: ["Admin", "Client"],
        userRoles: ["Client"],
        useCase: "/testcase/authorized",
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
          timestamp: expect.any(String),
          code: "glint-js/userNotAuthorized",
          message: "User is not authorized for given route.",
          params: {
            authorized: false,
            useCaseRoles: ["Admin", "Client"],
            userRoles: ["Authority"],
            username: authority.user.username,
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

  it("should handle OPTIONS request with Cache-Control header", async () => {
    const response = await TestService.call("OPTIONS", "testcase/public");
    expect(response.headers["cache-control"]).toBe("public, max-age=86400");
  });

  it("should throw CORS error for non-whitelisted origin", async () => {
    await AssertionService.assertCallThrows(
      () =>
        TestService.callPost("testcase/public", null, null, {
          headers: { Origin: "http://evil.com" },
        }),
      (response) => {
        expect(response.status).toBe(400);
        expect(response.data.message).toBe("Request was blocked by CORS policy.");
        expect(response.data.code).toBe("glint-js/blockedByCors");
      },
    );
  });
});

describe("Server._validateAndSortMiddlewares", () => {
  class ValidPreprocess {
    ORDER = 1;
    process(req, res, next) {} // eslint-disable-line no-unused-vars
  }
  class ValidErrorHandler {
    ORDER = 100;
    process(err, req, res, next) {} // eslint-disable-line no-unused-vars
  }

  it("should sort valid middlewares into preprocess and error", () => {
    const middlewares = [new ValidErrorHandler(), new ValidPreprocess()];
    const { preprocessMiddlewares, errorMiddlewares } = Server._validateAndSortMiddlewares(middlewares);
    expect(preprocessMiddlewares).toHaveLength(1);
    expect(errorMiddlewares).toHaveLength(1);
    expect(preprocessMiddlewares[0]).toBeInstanceOf(ValidPreprocess);
    expect(errorMiddlewares[0]).toBeInstanceOf(ValidErrorHandler);
  });

  it("should throw when middleware has no ORDER", () => {
    class NoOrder {
      process(req, res, next) {} // eslint-disable-line no-unused-vars
    }
    expect(() => Server._validateAndSortMiddlewares([new NoOrder()])).toThrow(
      "ORDER attribute is not set for middleware NoOrder",
    );
  });

  it("should throw when middleware has no process method", () => {
    class NoProcess {
      ORDER = 1;
    }
    expect(() => Server._validateAndSortMiddlewares([new NoProcess()])).toThrow(
      'Middleware NoProcess does not have "process" method defined.',
    );
  });

  it("should throw when two middlewares have the same ORDER", () => {
    class MdlA {
      ORDER = 5;
      process(req, res, next) {} // eslint-disable-line no-unused-vars
    }
    class MdlB {
      ORDER = 5;
      process(req, res, next) {} // eslint-disable-line no-unused-vars
    }
    expect(() => Server._validateAndSortMiddlewares([new MdlA(), new MdlB()])).toThrow(
      "Found middlewares with same ORDER attribute: MdlA, MdlB",
    );
  });

  it("should throw when process has invalid argument count", () => {
    class BadArgs {
      ORDER = 1;
      process(a, b) {} // eslint-disable-line no-unused-vars
    }
    expect(() => Server._validateAndSortMiddlewares([new BadArgs()])).toThrow(
      "Invalid length of arguments in middleware BadArgs",
    );
  });
});
