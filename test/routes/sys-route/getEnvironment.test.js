import { describe, it, expect } from "@jest/globals";
import TestService from "../../test-utils/test-service.js";
import TestUsers from "../../test-utils/test-users.js";

describe("sys/getEnvironment", () => {
  it("should respond 200", async () => {
    const response = await TestService.callGet("sys/getEnvironment", null, TestUsers.admin());

    expect(response.status).toBe(200);
    expect(response.data).toBeInstanceOf(Object);
    expect(response.data.MONGODB_DISABLED).toBe("false");
    expect(response.data.AUTH_COOKIE_KEY).toBe("cookieKey");
    expect(response.data.AUTH_JWT_KEY).toBe("jwtKey");
    expect(response.data.AUTH_REFRESH_TOKEN_KEY).toBe("refreshTokenKey");
    expect(response.data.LOG_LEVEL_GLOBAL).toBe("DEBUG");
    expect(response.data.PERMISSION_GRANT_KEY).toBe("testPermissionKey");
    expect(response.data.NODE_ENV).toBe("test");
    expect(typeof response.data.PRIMARY_MONGODB_URI).toBe("string");
    expect(typeof response.data.AUTH_MONGODB_URI).toBe("string");
  });
});
