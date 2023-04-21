import { beforeAll, describe, it, expect, afterAll } from "@jest/globals";
import axios from "axios";
import ContextMiddleware from "../../src/middlewares/context-middleware.js";
import ErrorHandler from "../../src/middlewares/error-handler.js";
import { RouteRegister } from "../../src/index.js";
import TestService from "../test-utils/test-service.js";
import AssertionService from "../test-utils/assertion-service.js";

// lite version of routes
const TEST_ROUTES = {
  "/testcase/hello": {
    method: "post",
    controller: () => {},
    hello: "world",
    roles: ["Public"],
  },
};

let port;
describe("ContextMiddleware", () => {
  beforeAll(async () => {
    // start server
    const app = await TestService.startExpress();
    port = TestService.expressServer.address().port;

    // register middlewares and routes
    app.use(ContextMiddleware.process.bind(ContextMiddleware));
    Object.keys(TEST_ROUTES).forEach((testRoute) => {
      RouteRegister.registerRoute(testRoute, TEST_ROUTES[testRoute]);

      app.post(testRoute, (req, res) => {
        res.send({ uri: req.ucEnv.uri, mapping: req.ucEnv.mapping });
      });
    });
    app.use(ErrorHandler.process.bind(ErrorHandler));
  });

  afterAll(async () => {
    await TestService.stopExpress();
  });

  it("should pass route handling and add UseCaseEnvironment to request", async () => {
    const response = await axios.post(`http://localhost:${port}/testcase/hello`);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      mapping: {
        hello: "world",
        method: "post",
        roles: ["Public"],
      },
      uri: `http://localhost:${port}/testcase/hello`,
    });
  });

  it("should fail on error 404 when calling unknown route", async () => {
    await AssertionService.assertCallThrows(
      () => axios.post(`http://localhost:${port}/testcase/doesNotExist`),
      (response) => {
        expect(response.status).toBe(404);
        expect(response.data).toMatchObject({
          message: "Handler for request not found.",
          code: "glint-js/handlerNotFound",
          params: {
            url: "/testcase/doesNotExist",
          },
        });
      },
    );
  });

  it("should fail on error 405 when calling route with different method", async () => {
    await AssertionService.assertCallThrows(
      () => axios.patch(`http://localhost:${port}/testcase/hello`),
      (response) => {
        expect(response.status).toBe(405);
        expect(response.data).toMatchObject({
          message: "Handler requested with invalid method.",
          code: "glint-js/invalidHandlerMethod",
          params: {
            url: "/testcase/hello",
            method: "PATCH",
            expectedMethod: "post",
          },
        });
      },
    );
  });
});
