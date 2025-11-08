import { describe, it, expect } from "@jest/globals";
import { RouteRegister } from "../../../src/index";

describe("sys/getMappings", () => {
  beforeAll(async () => {
    await RouteRegister.init();
  });

  it("should return success", async () => {
    const SysRoute = (await import("../../../src/routes/sys-route.js")).default;
    const dtoOut = await SysRoute.getMappings();

    expect(dtoOut).toHaveProperty("routes");
    expect(dtoOut.routes).toBeInstanceOf(Array);
    expect(dtoOut.routes.length).toBeGreaterThan(0);

    // Verify that routes have expected properties and no controller
    dtoOut.routes.forEach((route) => {
      expect(route).toHaveProperty("url");
      expect(route).toHaveProperty("method");
      expect(route).toHaveProperty("roles");
      expect(route.controller).toBeUndefined();
      expect(typeof route.url).toBe("string");
      expect(typeof route.method).toBe("string");
      expect(Array.isArray(route.roles)).toBe(true);
    });
  });
});
