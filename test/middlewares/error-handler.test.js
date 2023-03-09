import { jest, beforeAll, describe, it, expect, afterAll } from "@jest/globals";
import axios from "axios";
import ContextMiddleware from "../../src/middlewares/context-middleware.js";
import ErrorHandler from "../../src/middlewares/error-handler.js";
import { Config, RouteRegister } from "../../src/index.js";
import TestService from "../test-utils/test-service.js";
import AssertionService from "../test-utils/assertion-service.js";

// lite version of routes
const TEST_ROUTES = {
  "/testcase/hello": {
    method: "post",
    hello: "world",
    roles: ["Public"],
  },
};

describe("ErrorHandler", () => {
  beforeAll(async () => {
    // start server
    const app = await TestService.startExpress();

    // register middlewares and routes
    app.use(ContextMiddleware.process.bind(ContextMiddleware));
    Object.keys(TEST_ROUTES).forEach((testRoute) => {
      RouteRegister.registerRoute(testRoute, TEST_ROUTES[testRoute]);

      app.post(testRoute, () => {
        throw new Error("Some unexpected error");
      });
    });
    app.use(ErrorHandler.process.bind(ErrorHandler));
  });

  afterAll(async () => {
    await TestService.stopExpress();
  });

  it("should fail on error 500 and produce trace", async () => {
    await AssertionService.assertCallThrows(axios.post("http://localhost:8080/testcase/hello"), (response) => {
      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        message: "Some unexpected error",
        trace: expect.any(String),
      });
    });
  });

  it("should fail on error 500 and not produce trace", async () => {
    jest.spyOn(Config, "NODE_ENV", "get").mockReturnValue("production");

    await AssertionService.assertCallThrows(axios.post("http://localhost:8080/testcase/hello"), (response) => {
      expect(response.status).toBe(500);
      expect(response.data).toMatchObject({
        message: "Some unexpected error",
      });
      expect(response.data.trace).not.toBeDefined();
    });
  });
});
