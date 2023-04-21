import { jest, beforeAll, describe, it, expect, afterAll } from "@jest/globals";
import jwt from "jsonwebtoken";
import axios from "axios";
import AuthenticationMiddleware from "../../src/middlewares/authentication-middleware.js";
import ContextMiddleware from "../../src/middlewares/context-middleware.js";
import ErrorHandler from "../../src/middlewares/error-handler.js";
import { AuthenticationService, RouteRegister } from "../../src/index.js";
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
  "/testcase/authenticated": {
    method: "post",
    controller: () => {},
    roles: ["Authenticated"],
  },
};

let port;
describe("AuthenticationMiddleware", () => {
  beforeAll(async () => {
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
        (req, res) => {
          res.send(req.ucEnv.session);
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

  it("should pass authentication and add session to request", async () => {
    // Creating a valid token
    const tokenPayload = {
      id: 1,
      user: {
        username: "test@user.com",
      },
    };
    const token = jwt.sign(tokenPayload, "jwtKey", { expiresIn: "1h" });

    const response = await axios.post(
      `http://localhost:${port}/testcase/authenticated`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject(tokenPayload);
  });

  it("should return 401 when user is not authenticated", async () => {
    await AssertionService.assertCallThrows(
      () => axios.post(`http://localhost:${port}/testcase/hello`),
      (response) => {
        expect(response.status).toBe(401);
        expect(response.data).toMatchObject({
          message: "User is not authenticated.",
          code: "glint-js/userNotAuthenticated",
          params: {
            cause: "Header 'authorization' was not found.",
          },
        });
      },
    );
  });

  it("should return 401 when user is authenticated with wrong type", async () => {
    await AssertionService.assertCallThrows(
      () =>
        axios.post(
          `http://localhost:${port}/testcase/hello`,
          {},
          { headers: { authorization: "NoType asddfd156asd" } },
        ),
      (response) => {
        expect(response.status).toBe(401);
        expect(response.data).toMatchObject({
          message: "User is not authenticated.",
          code: "glint-js/userNotAuthenticated",
          params: {
            cause: "Header 'authorization' has invalid type, it should be Bearer type.",
          },
        });
      },
    );
  });

  it("should return 401 when user is authenticated with wrong token", async () => {
    // Creating a valid token
    const tokenPayload = {
      id: 1,
      user: {
        username: "test@user.com",
      },
    };
    const token = jwt.sign(tokenPayload, "invalidJwtKey", { expiresIn: "1h" });

    await AssertionService.assertCallThrows(
      () =>
        axios.post(`http://localhost:${port}/testcase/hello`, {}, { headers: { authorization: "Bearer " + token } }),
      (response) => {
        expect(response.status).toBe(401);
        expect(response.data).toMatchObject({
          message: "User is not authenticated.",
          code: "glint-js/userNotAuthenticated",
          params: {
            cause: {
              message: "invalid signature",
              name: "JsonWebTokenError",
            },
          },
        });
      },
    );
  });

  it("should not proceed with authentication since it is public route", async () => {
    jest.spyOn(AuthenticationService, "verifyToken");
    const response = await axios.post(`http://localhost:${port}/testcase/public`);

    expect(response.status).toBe(200);
    expect(response.data).toBeFalsy();
    expect(AuthenticationService.verifyToken).not.toHaveBeenCalled();
  });
});
