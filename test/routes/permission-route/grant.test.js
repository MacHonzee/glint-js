import { describe, it, expect } from "@jest/globals";
import TestService from "../../test-utils/test-service.js";
import TestUsers from "../../test-utils/test-users.js";
import AssertionService from "../../test-utils/assertion-service.js";
import PermissionRoute from "../../../src/routes/permission-route.js";
import { AuthorizationService } from "../../../src/index.js";

describe("permission/grant", () => {
  it("should return success", async () => {
    const authority = await TestUsers.authority();
    const grant = {
      user: authority.user.username,
      role: "Technician",
    };
    const ucEnv = await TestService.getUcEnv("permission/grant", grant);
    const dtoOut = await PermissionRoute.grant(ucEnv);

    const userRoles = await AuthorizationService.getUserRoles(grant.user);

    AssertionService.assertBaseData(dtoOut.permission);
    expect(dtoOut.permission).toMatchObject(grant);
    expect(userRoles).toContain("Technician");
  });
});
