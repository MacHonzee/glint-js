import { describe, it, beforeAll, expect } from "@jest/globals";
import { TestService, TestUsers, AssertionService } from "../../test-utils/index.js";
import { AuthenticationService } from "../../../src/index.js";
import UserRoute from "../../../src/routes/user-route.js";

const USER = {
  username: "userforchangepassword@mail.com",
  password: "řžýzuhniu!!",
  confirmPassword: "řžýzuhniu!!",
  firstName: "Bruce",
  lastName: "Wayne",
  email: "userForChangePassword@mail.com",
  language: "en",
};

const NEW_PASSWORD = {
  password: "4we/f489sd",
  confirmPassword: "4we/f489sd",
};

describe("user/changePassword", () => {
  beforeAll(async () => {
    await AuthenticationService.init();
    const registeredUser = await TestUsers.registerUser(USER);
    USER.id = registeredUser.user.id;
  });

  it("should return success", async () => {
    const newPassword = {
      currentPassword: USER.password,
      password: NEW_PASSWORD.password,
      confirmPassword: NEW_PASSWORD.confirmPassword,
    };
    const ucEnv = await TestService.getUcEnv("user/changePassword", newPassword, { user: USER });

    const dtoOut = await UserRoute.changePassword(ucEnv);

    AssertionService.assertToken(dtoOut.token);
    expect(dtoOut.user).toMatchObject({
      id: USER.id,
      username: USER.username,
      firstName: USER.firstName,
      lastName: USER.lastName,
    });
  });

  it("should invalidate previous password", async () => {
    // change password
    const newPassword = {
      currentPassword: NEW_PASSWORD.password,
      password: USER.password,
      confirmPassword: USER.confirmPassword,
    };
    const ucEnv = await TestService.getUcEnv("user/changePassword", newPassword, { user: USER });
    await UserRoute.changePassword(ucEnv);

    // try to login with old password
    const oldPasswordLogin = {
      username: USER.username,
      password: NEW_PASSWORD.password,
    };
    const loginUcEnv = await TestService.getUcEnv("user/login", oldPasswordLogin);
    await AssertionService.assertThrows(
      () => UserRoute.login(loginUcEnv),
      new UserRoute.ERRORS.LoginFailed(expect.any(Error)),
    );
  });

  it("should raise error MismatchingPasswords", async () => {
    const newPassword = {
      currentPassword: NEW_PASSWORD.password,
      password: "mismatch1",
      confirmPassword: "mismatchDifferent",
    };
    const ucEnv = await TestService.getUcEnv("user/changePassword", newPassword);

    await AssertionService.assertThrows(
      () => UserRoute.changePassword(ucEnv),
      new UserRoute.ERRORS.MismatchingPasswords(),
    );
  });
});
