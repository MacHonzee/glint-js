import { describe, it, expect, beforeAll } from "@jest/globals";
import { TestUsers } from "../../test-utils/index.js";
import PermissionRoute from "../../../src/routes/permission-route.js";
import { TestService, AssertionService } from "../../../src/test-utils/index.js";
import DefaultRoles from "../../../src/config/default-roles.js";

const USER = {
  username: "userforpermlist@mail.com",
  password: "123456",
  confirmPassword: "123456",
  firstName: "Permission",
  lastName: "List",
  email: "userforpermlist@mail.com",
  language: "en",
};

const OTHER_USER = {
  username: "otheruserforpermlist@mail.com",
  password: "654321",
  confirmPassword: "654321",
  firstName: "Other",
  lastName: "PermList",
  email: "otheruserforpermlist@mail.com",
  language: "en",
};

describe("permission/list", () => {
  let testUser;
  let otherTestUser;
  let adminUser;
  let authorityUser;

  beforeAll(async () => {
    testUser = await TestUsers.registerUser(USER);
    USER.id = testUser.user.id;
    otherTestUser = await TestUsers.registerUser(OTHER_USER);
    OTHER_USER.id = otherTestUser.user.id;
    adminUser = await TestUsers.admin();
    authorityUser = await TestUsers.authority();

    // Grant a role to testUser directly via PermissionRoute.grant
    const grantUcEnv = await TestService.getUcEnv("permission/grant", {
      user: testUser.user.username,
      role: "Technician",
    });
    await PermissionRoute.grant(grantUcEnv);
  });

  it("should list own permissions by default when no user is specified", async () => {
    const ucEnv = await TestService.getUcEnv("permission/list", {}, { user: testUser.user }, []);
    const dtoOut = await PermissionRoute.list(ucEnv);

    expect(dtoOut).toHaveProperty("permissions");
    expect(dtoOut.permissions).toBeInstanceOf(Array);
  });

  it("should list own permissions when user matches session user", async () => {
    const ucEnv = await TestService.getUcEnv(
      "permission/list",
      { user: testUser.user.username },
      { user: testUser.user },
      [],
    );
    const dtoOut = await PermissionRoute.list(ucEnv);

    expect(dtoOut).toHaveProperty("permissions");
    expect(dtoOut.permissions).toBeInstanceOf(Array);
    expect(dtoOut.permissions.length).toBeGreaterThanOrEqual(1);
    expect(dtoOut.permissions.some((p) => p.role === "Technician")).toBe(true);
  });

  it("should allow Admin to list other user's permissions", async () => {
    const ucEnv = await TestService.getUcEnv(
      "permission/list",
      { user: testUser.user.username },
      { user: adminUser.user },
      [DefaultRoles.admin],
    );
    const dtoOut = await PermissionRoute.list(ucEnv);

    expect(dtoOut).toHaveProperty("permissions");
    expect(dtoOut.permissions).toBeInstanceOf(Array);
  });

  it("should allow Authority to list other user's permissions", async () => {
    const ucEnv = await TestService.getUcEnv(
      "permission/list",
      { user: testUser.user.username },
      { user: authorityUser.user },
      [DefaultRoles.authority],
    );
    const dtoOut = await PermissionRoute.list(ucEnv);

    expect(dtoOut).toHaveProperty("permissions");
    expect(dtoOut.permissions).toBeInstanceOf(Array);
  });

  it("should raise CannotLoadRoles when non-privileged user lists other user's permissions", async () => {
    const ucEnv = await TestService.getUcEnv(
      "permission/list",
      { user: otherTestUser.user.username },
      { user: testUser.user },
      [],
    );

    await AssertionService.assertThrows(
      () => PermissionRoute.list(ucEnv),
      new PermissionRoute.ERRORS.CannotLoadRoles([]),
    );
  });
});

describe("permission/listAll", () => {
  it("should return all permissions", async () => {
    const dtoOut = await PermissionRoute.listAll();

    expect(dtoOut).toHaveProperty("permissions");
    expect(dtoOut.permissions).toBeInstanceOf(Array);
    expect(dtoOut.permissions.length).toBeGreaterThan(0);
  });
});
