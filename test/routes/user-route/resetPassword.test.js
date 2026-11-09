import { jest, describe, it, beforeAll, expect } from "@jest/globals";
import { TestUsers } from "../../test-utils/index.js";
import { AuthenticationService, UserService, MailService } from "../../../src/index.js";
import { TestService } from "../../../src/test-utils/index.js";
import UserRoute from "../../../src/routes/user-route.js";
import RefreshTokenModel from "../../../src/models/refresh-token-model.js";

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

  beforeEach(() => {
    jest.clearAllMocks();
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

  it("should not verify the user or sign out existing sessions", async () => {
    const loginUcEnv = await TestService.getUcEnv("user/login", {
      username: USER.username,
      password: USER.password,
    });
    await UserRoute.login(loginUcEnv);

    const user = await UserService.findByUsername(USER.username.toLowerCase());
    user.verified = false;
    user.verificationToken = "still-pending";
    await user.save();

    const sessionsBefore = await RefreshTokenModel.find({ "user.username": USER.username.toLowerCase() });
    expect(sessionsBefore.length).toBeGreaterThan(0);

    const ucEnv = await TestService.getUcEnv("user/resetPassword", {
      username: USER.username,
      hostUri: "https://test-host.app.com",
    });
    const dtoOut = await UserRoute.resetPassword(ucEnv);

    const updatedUser = await UserService.findByUsername(USER.username.toLowerCase());
    const sessionsAfter = await RefreshTokenModel.find({ "user.username": USER.username.toLowerCase() });

    expect(dtoOut.status).toBe("OK");
    expect(updatedUser.verified).toBe(false);
    expect(updatedUser.verificationToken).toBe("still-pending");
    expect(updatedUser.resetToken).toBeTruthy();
    expect(sessionsAfter).toHaveLength(sessionsBefore.length);
  });

  it("should return success if username is not found", async () => {
    const resetPassword = {
      username: "nonexistent@mail.com",
      hostUri: "https://test-host.app.com",
    };
    const ucEnv = await TestService.getUcEnv("user/resetPassword", resetPassword);
    const dtoOut = await UserRoute.resetPassword(ucEnv);
    expect(dtoOut.status).toBe("OK");
    expect(mockMailProvider.sendResetPasswordMail).not.toHaveBeenCalled();
  });
});
