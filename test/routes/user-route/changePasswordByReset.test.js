import { jest, describe, it, beforeAll, expect } from "@jest/globals";
import TestService from "../../test-utils/test-service.js";
import AuthenticationService from "../../../src/services/authentication/authentication-service.js";
import UserService from "../../../src/services/authentication/user-service.js";
import MailService from "../../../src/services/mail/mail-service.js";
import TestUsers from "../../test-utils/test-users.js";
import AssertionService from "../../test-utils/assertion-service.js";

const USER = {
  username: "userForResetPasswordTwo@mail.com",
  password: "qwertzuiop",
  confirmPassword: "qwertzuiop",
  firstName: "Kamil",
  lastName: "Pokamil",
  email: "userForResetPasswordTwo@mail.com",
  language: "cs",
};

jest.spyOn(MailService, "send").mockImplementation();

describe("user/changePasswordByReset", () => {
  let UserRoute, resetToken;
  beforeAll(async () => {
    UserRoute = (await import("../../../src/routes/user-route.js")).default;
    await AuthenticationService.init();
    const registeredUser = await TestUsers.registerUser(USER);
    USER.id = registeredUser.user.id;

    // start the password reset
    const resetPassword = {
      username: USER.username,
      hostUri: "https://test-host.app.com",
    };
    const ucEnv = await TestService.getUcEnv("user/resetPassword", resetPassword);
    await UserRoute.resetPassword(ucEnv);
    const updatedUser = await UserService.findByUsername(USER.username.toLowerCase());
    resetToken = updatedUser.resetToken;
  });

  it("should return success", async () => {
    const changePasswordByReset = {
      token: resetToken,
      password: "newPass1234",
      confirmPassword: "newPass1234",
    };
    const ucEnv = await TestService.getUcEnv("user/changePasswordByReset", changePasswordByReset);

    // reset the password to something else
    const dtoOut = await UserRoute.changePasswordByReset(ucEnv);

    // try to log in with new password - should work
    const login = {
      username: USER.username,
      password: changePasswordByReset.password,
    };
    const loginUcEnv = await TestService.getUcEnv("user/login", login);
    const loginDtoOut = await UserRoute.login(loginUcEnv);

    // check that we could log in correctly
    expect(dtoOut.status).toBe("OK");
    AssertionService.assertToken(loginDtoOut.token);
  });

  it("should raise error MismatchingPasswords", async () => {
    const changePasswordByReset = {
      token: resetToken,
      password: "newPass1234",
      confirmPassword: "mismatchingPass",
    };
    const ucEnv = await TestService.getUcEnv("user/changePasswordByReset", changePasswordByReset);

    await AssertionService.assertThrows(
      () => UserRoute.changePasswordByReset(ucEnv),
      new UserRoute.ERRORS.MismatchingPasswords(),
    );
  });
});
