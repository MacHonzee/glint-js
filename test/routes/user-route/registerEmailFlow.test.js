import { jest, describe, it, beforeAll, afterAll, expect } from "@jest/globals";
import { AuthenticationService, UserService, MailService, Config } from "../../../src/index.js";
import { TestService, AssertionService } from "../../../src/test-utils/index.js";
import UserRoute from "../../../src/routes/user-route.js";

const USER = {
  username: "emailFlowUser@mail.com",
  password: "securePassword123",
  confirmPassword: "securePassword123",
  firstName: "Jane",
  lastName: "Doe",
  email: "emailFlowUser@mail.com",
  language: "en",
  hostUri: "https://test-app.example.com",
};

// Create a mock mail provider and register it
class MockMailProvider extends MailService {
  async send() {}
}

const mockMailProvider = new MockMailProvider();
MailService.setInstance(mockMailProvider);
jest.spyOn(mockMailProvider, "sendRegistrationVerificationMail").mockResolvedValue();

describe("user/register (email flow)", () => {
  beforeAll(async () => {
    await AuthenticationService.init();
    Config.set("GLINT_REGISTRATION_FLOW", "email");
  });

  afterAll(() => {
    // reset back to default (basic) flow
    delete process.env.GLINT_REGISTRATION_FLOW;
  });

  it("should return status OK without token or user", async () => {
    const ucEnv = await TestService.getUcEnv("user/register", { ...USER });
    const dtoOut = await UserRoute.register(ucEnv);

    // email flow must NOT return token or user (anti-bot measure)
    expect(dtoOut.status).toBe("OK");
    expect(dtoOut.token).toBeUndefined();
    expect(dtoOut.user).toBeUndefined();
  });

  it("should create user with verified=false and a verificationToken", async () => {
    const user = await UserService.findByUsername(USER.username.toLowerCase());
    expect(user.verified).toBe(false);
    expect(user.verificationToken).toBeTruthy();
  });

  it("should send the registration verification email", async () => {
    const user = await UserService.findByUsername(USER.username.toLowerCase());
    expect(mockMailProvider.sendRegistrationVerificationMail).toHaveBeenCalledWith({
      to: USER.email,
      verificationToken: user.verificationToken,
      hostUri: USER.hostUri,
    });
  });

  it("should block login for unverified user", async () => {
    const loginData = {
      username: USER.username,
      password: USER.password,
    };
    const ucEnv = await TestService.getUcEnv("user/login", loginData);

    await AssertionService.assertThrows(() => UserRoute.login(ucEnv), new UserRoute.ERRORS.UserNotVerified());
  });
});

describe("user/verifyRegistration", () => {
  let verificationToken;

  beforeAll(async () => {
    const user = await UserService.findByUsername(USER.username.toLowerCase());
    verificationToken = user.verificationToken;
  });

  it("should verify the user and return status OK", async () => {
    const ucEnv = await TestService.getUcEnv("user/verifyRegistration", { token: verificationToken });
    const dtoOut = await UserRoute.verifyRegistration(ucEnv);

    expect(dtoOut.status).toBe("OK");

    // check user is now verified
    const user = await UserService.findByUsername(USER.username.toLowerCase());
    expect(user.verified).toBe(true);
    expect(user.verificationToken).toBeUndefined();
  });

  it("should reject a token that has already been used", async () => {
    const ucEnv = await TestService.getUcEnv("user/verifyRegistration", { token: verificationToken });

    await AssertionService.assertThrows(
      () => UserRoute.verifyRegistration(ucEnv),
      new UserRoute.ERRORS.InvalidVerificationToken(),
    );
  });

  it("should allow login after verification", async () => {
    const loginData = {
      username: USER.username,
      password: USER.password,
    };
    const ucEnv = await TestService.getUcEnv("user/login", loginData);
    const dtoOut = await UserRoute.login(ucEnv);

    AssertionService.assertToken(dtoOut.token);
    // username is normalized to lowercase during registration
    AssertionService.assertUser(dtoOut.user, { ...USER, username: USER.username.toLowerCase() });
  });
});
