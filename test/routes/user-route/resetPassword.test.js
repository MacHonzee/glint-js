import { jest, describe, it, beforeAll, expect } from "@jest/globals";
import { TestUsers } from "../../test-utils/index.js";
import { AuthenticationService, UserService, MailService } from "../../../src/index.js";
import { TestService } from "../../../src/test-utils/index.js";
import UserRoute from "../../../src/routes/user-route.js";

const USER = {
  username: "userForResetPassword@mail.com",
  password: "čšřžsaýfgzudsf",
  confirmPassword: "čšřžsaýfgzudsf",
  firstName: "Max",
  lastName: "Payne",
  email: "userForResetPassword@mail.com",
  language: "cs",
};

// Create a mock mail provider and register it
class MockMailProvider extends MailService {
  async send() {}
}

const mockMailProvider = new MockMailProvider();
MailService.setInstance(mockMailProvider);
jest.spyOn(mockMailProvider, "sendResetPasswordMail").mockResolvedValue();

describe("user/resetPassword", () => {
  beforeAll(async () => {
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
    expect(mockMailProvider.sendResetPasswordMail).toHaveBeenCalledWith({
      to: USER.username,
      resetToken,
      hostUri: resetPassword.hostUri,
    });
  });
});
