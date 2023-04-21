import { jest, beforeAll, describe, it, expect, afterAll } from "@jest/globals";
import jwt from "jsonwebtoken";
import axios from "axios";
import AuthenticationMiddleware from "../../src/middlewares/authentication-middleware.js";
import ContextMiddleware from "../../src/middlewares/context-middleware.js";
import ErrorHandler from "../../src/middlewares/error-handler.js";
import AuthorizationMiddleware from "../../src/middlewares/authorization-middleware.js";
import { AuthenticationService, AuthorizationService, RouteRegister } from "../../src/index.js";
import TestService from "../test-utils/test-service.js";
import AssertionService from "../test-utils/assertion-service.js";

// lite version of routes
const TEST_ROUTES = {
  "/testcase/hello": {
    method: "post",
    controller: () => {},
    roles: ["Admin"],
  },
  "/testcase/public": {
    method: "post",
    controller: () => {},
    roles: ["Public"],
  },
};

let port;
describe("AuthorizationMiddleware", () => {
  beforeAll(async () => {
    jest.spyOn(AuthorizationService, "authorize");

    // start server
    const app = await TestService.startExpress();
    port = TestService.expressServer.address().port;

    // register routes
    Object.keys(TEST_ROUTES).forEach((testRoute) => {
      RouteRegister.registerRoute(testRoute, TEST_ROUTES[testRoute]);

      app.post(
        testRoute,
        ContextMiddleware.process.bind(ContextMiddleware),
        AuthenticationMiddleware.process.bind(AuthenticationMiddleware),
        AuthorizationMiddleware.process.bind(AuthorizationMiddleware),
        (req, res) => {
          res.send(req.ucEnv.authorizationResult);
        },
        ErrorHandler.process.bind(ErrorHandler),
      );
    });

    // init AuthenticationService
    await AuthenticationService.init();
  });

  afterAll(async () => {
    await TestService.stopExpress();
  });

  it("should pass authorization and add authorizationResult to request", async () => {
    AuthorizationService.authorize.mockResolvedValueOnce({ authorized: true });

    // Creating a valid token
    const tokenPayload = {
      id: 1,
      user: {
        username: "test@user.com",
      },
    };
    const token = jwt.sign(tokenPayload, "jwtKey", { expiresIn: "1h" });

    const response = await axios.post(
      `http://localhost:${port}/testcase/hello`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ authorized: true });
  });

  it("should return 403 when user is not authorized", async () => {
    AuthorizationService.authorize.mockResolvedValueOnce({ authorized: false });

    await AssertionService.assertCallThrows(
      () => {
        const tokenPayload = {
          id: 1,
          user: {
            username: "test@user.com",
          },
        };
        const token = jwt.sign(tokenPayload, "jwtKey", { expiresIn: "1h" });

        return axios.post(
          `http://localhost:${port}/testcase/hello`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      },

      (response) => {
        expect(response.status).toBe(403);
        expect(response.data).toMatchObject({
          message: "User is not authorized for given route.",
          code: "glint-js/userNotAuthorized",
          params: {
            authorized: false,
          },
        });
      },
    );
  });

  it("should not proceed with authorization since it is public route", async () => {
    jest.clearAllMocks();
    const response = await axios.post(`http://localhost:${port}/testcase/public`);

    expect(response.status).toBe(200);
    expect(response.data).toBeFalsy();
    expect(AuthorizationService.authorize).not.toHaveBeenCalled();
  });
});
