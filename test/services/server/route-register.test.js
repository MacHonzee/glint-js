import path from "path";
import { describe, beforeAll, it, expect } from "@jest/globals";
import { RouteRegister, Config } from "../../../src/index";

describe("RouteRegister", () => {
  beforeAll(async () => {
    // Initialize RouteRegister before running tests
    Config.set("SERVER_ROOT", path.join(Config.SERVER_ROOT, "test", "test-app"));
    await RouteRegister.init();
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
      const route = RouteRegister.getRoute("testcase/hello");
      expect(route.url).toBe("testcase/hello");
      expect(route.method).toBe("post");
      expect(typeof route.controller).toBe("function");
      expect(typeof route.config).toBe("object");
      expect(route.config.roles).toEqual(["Admin"]);
    });

    it("should throw an error if RouteRegister was not initialized properly", () => {
      // Create a new instance of RouteRegister without calling init()
      const routeRegister = new RouteRegister.constructor();

      expect(() => {
        routeRegister.getRoute("/test");
      }).toThrowError("RouteRegister was not initialized properly, cannot load route metadata");
    });
  });
});
