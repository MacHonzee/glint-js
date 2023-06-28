import { jest, describe, it, beforeAll, expect } from "@jest/globals";
import TestService from "../../test-utils/test-service.js";
import AuthenticationService from "../../../src/services/authentication/authentication-service.js";
import UserService from "../../../src/services/authentication/user-service.js";
import MailService from "../../../src/services/mail/mail-service.js";
import TestUsers from "../../test-utils/test-users.js";

const USER = {
  username: "userForResetPassword@mail.com",
  password: "čšřžsaýfgzudsf",
  confirmPassword: "čšřžsaýfgzudsf",
  firstName: "Max",
  lastName: "Payne",
  email: "userForResetPassword@mail.com",
  language: "cs",
};

jest.spyOn(MailService, "send").mockImplementation();

describe("user/resetPassword", () => {
  let UserRoute;
  beforeAll(async () => {
    UserRoute = (await import("../../../src/routes/user-route.js")).default;
    await AuthenticationService.init();
    const registeredUser = await TestUsers.registerUser(USER);
    USER.id = registeredUser.user.id;
  });

  it("should return success", async () => {
    const resetPassword = {
      username: USER.username,
      hostUri: "https://test-host.app.com",
    };
    const ucEnv = await TestService.getUcEnv("user/resetPassword", resetPassword);

    // check that the token was set
    const dtoOut = await UserRoute.resetPassword(ucEnv);
    const updatedUser = await UserService.findByUsername(USER.username.toLowerCase());
    const resetToken = updatedUser.resetToken;

    // check that we have sent the mail
    expect(dtoOut.status).toBe("OK");
    expect(resetToken).toBeTruthy();
    expect(MailService.send).toHaveBeenCalledWith({
      to: USER.username,
      subject: UserRoute.RESET_PASS_MAIL.subject,
      html: UserRoute.RESET_PASS_MAIL.html({ resetToken, hostUri: resetPassword.hostUri }),
    });
  });
});
