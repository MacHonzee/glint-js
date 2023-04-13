import { describe, it, expect } from "@jest/globals";

describe("sys/getEnvironment", () => {
  it("should return success", async () => {
    const SysRoute = (await import("../../../src/routes/sys-route.js")).default;
    const dtoOut = await SysRoute.getEnvironment();

    expect(dtoOut.MONGODB_DISABLED).toBe("false");
    expect(dtoOut.AUTH_COOKIE_KEY).toBe("cookieKey");
    expect(dtoOut.AUTH_JWT_KEY).toBe("jwtKey");
    expect(dtoOut.AUTH_REFRESH_TOKEN_KEY).toBe("refreshTokenKey");
    expect(dtoOut.LOG_LEVEL_GLOBAL).toBe("DEBUG");
    expect(dtoOut.PERMISSION_GRANT_KEY).toBe("testPermissionKey");
    expect(dtoOut.NODE_ENV).toBe("test");
    expect(typeof dtoOut.PRIMARY_MONGODB_URI).toBe("string");
    expect(typeof dtoOut.AUTH_MONGODB_URI).toBe("string");
  });
});
