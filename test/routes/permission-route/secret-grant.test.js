import { jest, describe, it, expect, beforeAll } from "@jest/globals";
import { TestUsers } from "../../test-utils/index.js";
import { AuthorizationService, Config, SecretManager } from "../../../src/index.js";
import { TestService, AssertionService } from "../../../src/test-utils/index.js";
import PermissionRoute from "../../../src/routes/permission-route.js";

const USER = {
  username: "userforsecretgrant@mail.com",
  password: "123456",
  confirmPassword: "123456",
  firstName: "Permission",
  lastName: "Grant",
  email: "userforsecretgrant@mail.com",
  language: "en",
};

describe("permission/secretGrant", () => {
  let testUser;
  beforeAll(async () => {
    testUser = await TestUsers.registerUser(USER);
    USER.id = testUser.user.id;
  });

  it("should return success", async () => {
    Config.set("PERMISSION_GRANT_KEY", "superTestSecret");

    const grant = {
      secret: "superTestSecret",
      user: testUser.user.username,
      role: "Admin",
    };
    const ucEnv = await TestService.getUcEnv("permission/secretGrant", grant);
    const dtoOut = await PermissionRoute.secretGrant(ucEnv);

    const userRoles = await AuthorizationService.getUserRoles(grant.user);

    AssertionService.assertBaseData(dtoOut.permission);
    expect(dtoOut.permission).toMatchObject({ user: grant.user, role: grant.role });
    expect(userRoles).toMatchObject(["Admin"]);
  });

  it("should raise error PermissionSecretNotAvailable", async () => {
    Config.set("PERMISSION_GRANT_KEY", "");
    jest.spyOn(SecretManager, "get").mockResolvedValueOnce(null);

    const grant = {
      secret: "superTestSecret",
      user: testUser.user.username,
      role: "Admin",
    };
    const ucEnv = await TestService.getUcEnv("permission/secretGrant", grant);

    await AssertionService.assertThrows(
      () => PermissionRoute.secretGrant(ucEnv),
      new PermissionRoute.ERRORS.PermissionSecretNotAvailable(),
    );
  });

  it("should raise error PermissionSecretNotMatching", async () => {
    Config.set("PERMISSION_GRANT_KEY", "differentSecret");

    const grant = {
      secret: "superTestSecret",
      user: testUser.user.username,
      role: "Admin",
    };
    const ucEnv = await TestService.getUcEnv("permission/secretGrant", grant);

    await AssertionService.assertThrows(
      () => PermissionRoute.secretGrant(ucEnv),
      new PermissionRoute.ERRORS.PermissionSecretNotMatching(grant.secret),
    );
  });
});
