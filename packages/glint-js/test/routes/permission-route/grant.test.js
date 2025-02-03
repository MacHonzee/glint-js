import { describe, it, expect, beforeAll } from "@jest/globals";
import { TestService, AssertionService } from "glint-js-kit";
import { TestUsers } from "../../test-utils/index.js";
import PermissionRoute from "../../../src/routes/permission-route.js";
import { AuthorizationService } from "../../../src/index.js";

const USER = {
  username: "userforgrant@mail.com",
  password: "123456",
  confirmPassword: "123456",
  firstName: "Permission",
  lastName: "Grant",
  email: "userforgrant@mail.com",
  language: "en",
};

describe("permission/grant", () => {
  let testUser;
  beforeAll(async () => {
    testUser = await TestUsers.registerUser(USER);
    USER.id = testUser.user.id;
  });

  it("should return success", async () => {
    const grant = {
      user: testUser.user.username,
      role: "Technician",
    };
    const ucEnv = await TestService.getUcEnv("permission/grant", grant);
    const dtoOut = await PermissionRoute.grant(ucEnv);

    const userRoles = await AuthorizationService.getUserRoles(grant.user);

    AssertionService.assertBaseData(dtoOut.permission);
    expect(dtoOut.permission).toMatchObject(grant);
    expect(userRoles).toMatchObject(["Technician"]);
  });
});
