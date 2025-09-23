import { describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import { TestUsers } from "../../test-utils/index.js";
import { AuthorizationService } from "../../../src/index.js";
import { TestService } from "../../../src/test-utils/index.js";
import PermissionRoute from "../../../src/routes/permission-route.js";

const USER = {
  username: "userforrevoke@test.com",
  password: "123456",
  confirmPassword: "123456",
  firstName: "Permission",
  lastName: "Grant",
  email: "userforrevoke@test.com",
  language: "en",
};
const ROLES = ["Authority", "Technician"];

describe("permission/revoke", () => {
  let testUser;
  beforeAll(async () => {
    testUser = await TestUsers.registerUser(USER);
    USER.id = testUser.user.id;
  });

  beforeEach(async () => {
    await TestUsers.grantPermissions("userforrevoke", ROLES);
  });

  it("should return success", async () => {
    const revoke = {
      user: testUser.user.username,
      role: "Technician",
    };
    const ucEnv = await TestService.getUcEnv("permission/revoke", revoke);
    const dtoOut = await PermissionRoute.revoke(ucEnv);

    const userRoles = await AuthorizationService.getUserRoles(revoke.user);

    expect(dtoOut.revoked).toBe(revoke.role);
    expect(userRoles).toMatchObject(ROLES.filter((role) => role !== revoke.role));
  });

  it("should revoke all permissions", async () => {
    const revoke = {
      user: testUser.user.username,
      all: true,
    };
    const ucEnv = await TestService.getUcEnv("permission/revoke", revoke);
    const dtoOut = await PermissionRoute.revoke(ucEnv);

    const userRoles = await AuthorizationService.getUserRoles(revoke.user);

    expect(dtoOut.revoked).toBe("all");
    expect(userRoles).toMatchObject([]);
  });
});
