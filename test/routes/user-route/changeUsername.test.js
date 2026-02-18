import { jest, describe, it, beforeAll, expect } from "@jest/globals";
import { AuthenticationService, MailService } from "../../../src/index.js";
import { TestService, AssertionService } from "../../../src/test-utils/index.js";
import { TestUsers } from "../../test-utils/index.js";
import UserRoute from "../../../src/routes/user-route.js";
import UserService from "../../../src/services/authentication/user-service.js";
import PermissionModel from "../../../src/models/permission-model.js";
import DefaultRoles from "../../../src/config/default-roles.js";
import ValidationService from "../../../src/services/validation/validation-service.js";

class MockMailProvider extends MailService {
  async send() {}
}

const TARGET_USER = {
  username: "targetuser@mail.com",
  password: "456ZUGfsfsg",
  confirmPassword: "456ZUGfsfsg",
  firstName: "Target",
  lastName: "User",
  email: "targetuser@mail.com",
  language: "en",
};

const OTHER_USER = {
  username: "otheruser@mail.com",
  password: "789XYZabc",
  confirmPassword: "789XYZabc",
  firstName: "Other",
  lastName: "User",
  email: "otheruser@mail.com",
  language: "en",
};

describe("user/changeUsername", () => {
  let targetTestUser;
  let otherTestUser;
  let adminUser;

  beforeAll(async () => {
    MailService.setInstance(new MockMailProvider());
    await AuthenticationService.init();
    await ValidationService.init();
    targetTestUser = await TestUsers.registerUser(TARGET_USER);
    TARGET_USER.id = targetTestUser.user.id;
    otherTestUser = await TestUsers.registerUser(OTHER_USER);
    OTHER_USER.id = otherTestUser.user.id;
    adminUser = await TestUsers.admin();
  });

  it("should successfully change username and email when user has Admin role", async () => {
    const newUsername = "newadminuser@mail.com";
    const newEmail = "newadminemail@mail.com";
    const dtoIn = {
      userId: TARGET_USER.id,
      username: newUsername,
      email: newEmail,
    };
    const ucEnv = await TestService.getUcEnv(
      "user/changeUsername",
      dtoIn,
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );

    const dtoOut = await UserRoute.changeUsername(ucEnv);

    expect(dtoOut.username).toBe(newUsername.toLowerCase());
    expect(dtoOut.email).toBe(newEmail.toLowerCase());
    expect(dtoOut.id).toBe(TARGET_USER.id);
    expect(dtoOut.hash).toBeUndefined();
    expect(dtoOut.salt).toBeUndefined();

    // Verify user can login with new username
    const loginResult = await AuthenticationService.login(newUsername.toLowerCase(), TARGET_USER.password);
    expect(loginResult.user).toBeTruthy();
  });

  it("should default email to username when email is not provided", async () => {
    const newUsername = "usernameonly@mail.com";
    const dtoIn = {
      userId: TARGET_USER.id,
      username: newUsername,
    };
    const ucEnv = await TestService.getUcEnv(
      "user/changeUsername",
      dtoIn,
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );

    const dtoOut = await UserRoute.changeUsername(ucEnv);

    expect(dtoOut.username).toBe(newUsername.toLowerCase());
    expect(dtoOut.email).toBe(newUsername.toLowerCase());
  });

  it("should call sendUsernameChangeMail when method is defined", async () => {
    const mailService = MailService.getInstance();
    mailService.sendUsernameChangeMail = jest.fn();

    const newUsername = "notifieduser@mail.com";
    const dtoIn = {
      userId: TARGET_USER.id,
      username: newUsername,
      email: "notified@mail.com",
    };
    const ucEnv = await TestService.getUcEnv(
      "user/changeUsername",
      dtoIn,
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );
    await UserRoute.changeUsername(ucEnv);

    expect(mailService.sendUsernameChangeMail).toHaveBeenCalledTimes(1);
    expect(mailService.sendUsernameChangeMail.mock.calls[0][0].user.username).toBe(newUsername.toLowerCase());
    expect(mailService.sendUsernameChangeMail.mock.calls[0][0].oldUsername).toBeDefined();

    delete mailService.sendUsernameChangeMail;
  });

  it("should update permissions when username changes", async () => {
    const userWithRole = await TestUsers.registerUser({
      username: "userwithrole@mail.com",
      password: "pass123",
      confirmPassword: "pass123",
      firstName: "Role",
      lastName: "User",
      email: "userwithrole@mail.com",
      language: "en",
    });
    const PermissionRoute = (await import("../../../src/routes/permission-route.js")).default;
    const grantUcEnv = await TestService.getUcEnv(
      "permission/grant",
      { user: "userwithrole@mail.com", role: "Technician" },
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );
    await PermissionRoute.grant(grantUcEnv);

    const newUsername = "migrateduser@mail.com";
    const changeUsernameUcEnv = await TestService.getUcEnv(
      "user/changeUsername",
      { userId: userWithRole.user.id, username: newUsername },
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );
    await UserRoute.changeUsername(changeUsernameUcEnv);

    const permissions = await PermissionModel.listByUser(newUsername.toLowerCase());
    expect(permissions).toHaveLength(1);
    expect(permissions[0].user).toBe(newUsername.toLowerCase());
    expect(permissions[0].role).toBe("Technician");
  });

  it("should raise UserNotFound when userId does not exist", async () => {
    const nonExistentId = "507f1f77bcf86cd799439011";
    const dtoIn = {
      userId: nonExistentId,
      username: "nonexistent@mail.com",
      email: "nonexistent@mail.com",
    };
    const ucEnv = await TestService.getUcEnv(
      "user/changeUsername",
      dtoIn,
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );

    await AssertionService.assertThrows(
      () => UserRoute.changeUsername(ucEnv),
      new UserService.ERRORS.UserNotFound(nonExistentId),
    );
  });

  it("should raise ChangeUsernameFailed when new username is already taken", async () => {
    const dtoIn = {
      userId: TARGET_USER.id,
      username: OTHER_USER.username,
      email: "different@mail.com",
    };
    const ucEnv = await TestService.getUcEnv(
      "user/changeUsername",
      dtoIn,
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );

    await AssertionService.assertThrows(
      () => UserRoute.changeUsername(ucEnv),
      new UserRoute.ERRORS.ChangeUsernameFailed("Error", "A duplicate key error occurred in a database."),
    );
  });

  it("should raise InvalidDtoIn when userId is missing", async () => {
    const dtoIn = {
      username: "valid@mail.com",
      email: "valid@mail.com",
    };
    const ucEnv = await TestService.getUcEnv(
      "user/changeUsername",
      dtoIn,
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );

    await expect(UserRoute.changeUsername(ucEnv)).rejects.toThrow("Invalid dtoIn.");
  });

  it("should raise InvalidDtoIn when username is missing", async () => {
    const dtoIn = {
      userId: TARGET_USER.id,
      email: "valid@mail.com",
    };
    const ucEnv = await TestService.getUcEnv(
      "user/changeUsername",
      dtoIn,
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );

    await expect(UserRoute.changeUsername(ucEnv)).rejects.toThrow("Invalid dtoIn.");
  });

  it("should raise InvalidDtoIn when username has invalid format", async () => {
    const dtoIn = {
      userId: TARGET_USER.id,
      username: "not-an-email",
      email: "valid@mail.com",
    };
    const ucEnv = await TestService.getUcEnv(
      "user/changeUsername",
      dtoIn,
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );

    await expect(UserRoute.changeUsername(ucEnv)).rejects.toThrow("Invalid dtoIn.");
  });

  it("should raise InvalidDtoIn when userId has invalid ObjectId format", async () => {
    const dtoIn = {
      userId: "invalid-id",
      username: "valid@mail.com",
      email: "valid@mail.com",
    };
    const ucEnv = await TestService.getUcEnv(
      "user/changeUsername",
      dtoIn,
      { id: adminUser.user.id, user: adminUser.user },
      [DefaultRoles.admin],
    );

    await expect(UserRoute.changeUsername(ucEnv)).rejects.toThrow("Invalid dtoIn.");
  });
});
