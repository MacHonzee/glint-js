import path from "path";
import { describe, beforeAll, it, expect } from "@jest/globals";
import { RouteRegister, Config } from "../../../src/index";
import { AssertionService } from "../../test-utils/index.js";

describe("RouteRegister", () => {
  beforeAll(async () => {
    // Initialize RouteRegister before running tests
    Config.set("SERVER_ROOT", path.join(Config.SERVER_ROOT, "test", "test-app"));
    await RouteRegister.init();
  });

  describe("registerRoute", () => {
    const VALID_ROUTE = {
      controller: () => {},
      roles: [],
      method: "patch",
    };

    it("should successfully register valid route", () => {
      RouteRegister.registerRoute("/route/hello", VALID_ROUTE);
    });

    it("should successfully register valid route without slash at beginning", () => {
      RouteRegister.registerRoute("route/hello", VALID_ROUTE);
    });

    it("should successfully register valid route with multiple slashes", () => {
      RouteRegister.registerRoute("route/hello/from/other/side", VALID_ROUTE);
    });

    it("should not register route with invalid url", () => {
      AssertionService.assertThrows(
        () => RouteRegister.registerRoute(false, VALID_ROUTE),
        new Error("Url 'false' is not of string type."),
      );
    });

    it("should not register route with invalid configuration", () => {
      AssertionService.assertThrows(
        () => RouteRegister.registerRoute("test/route", 123),
        new Error("Route configuration '123' is not of object type."),
      );
    });

    it("should not register route with unknown method", () => {
      AssertionService.assertThrows(
        () => RouteRegister.registerRoute("test/route", { method: "wtf" }),
        new Error("Route method 'wtf' is not one of allowed methods: get,post,patch,put,delete,head"),
      );
    });

    it("should not register route with unknown method", () => {
      AssertionService.assertThrows(
        () => RouteRegister.registerRoute("test/route", { method: "post", controller: false }),
        new Error("Route controller 'false' is not of function type."),
      );
    });

    it("should not register route with unknown method", () => {
      AssertionService.assertThrows(
        () => RouteRegister.registerRoute("test/route", { method: "post", controller: () => {}, roles: "hello" }),
        new Error("Route roles 'hello' are not of Array type."),
      );
    });
  });

  describe("getRoutes()", () => {
    it("should return an array of route objects", () => {
      const routes = RouteRegister.getRoutes();

      expect(Array.isArray(routes)).toBe(true);
      expect(routes.length).toBeGreaterThan(0);

      routes.forEach((route) => {
        expect(typeof route.url).toBe("string");
        expect(typeof route.method).toBe("string");
        expect(typeof route.controller).toBe("function");
        expect(typeof route.config).toBe("object");
      });
    });
  });

  describe("getRoute(routeUrl)", () => {
    it("should return a route object for the specified URL", () => {
      const routes = RouteRegister.getRoutes();

      routes.forEach((route) => {
        const result = RouteRegister.getRoute(route.url);
        expect(result).toEqual(route);
      });
    });

    it("should return a route object specified in application's mappings.js", () => {
      const route = RouteRegister.getRoute("/testcase/hello");
      expect(route.url).toBe("/testcase/hello");
      expect(route.method).toBe("post");
      expect(typeof route.controller).toBe("function");
      expect(typeof route.config).toBe("object");
      expect(route.config.roles).toEqual(["Admin"]);
    });
  });
});
