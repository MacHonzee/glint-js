import { describe, it, beforeAll, expect } from "@jest/globals";
import { TestService, TestUsers, AssertionService } from "../../test-utils/index.js";
import { AuthenticationService } from "../../../src/index.js";
import UserRoute from "../../../src/routes/user-route.js";

const USER = {
  username: "user_for_logout@mail.com",
  password: "mklopijhgfr",
  confirmPassword: "mklopijhgfr",
  firstName: "Romana",
  lastName: "Rudolf Lojková",
  email: "user_for_logout@mail.com",
  language: "en",
};

describe("user/logout", () => {
  beforeAll(async () => {
    await AuthenticationService.init();
    const registeredUser = await TestUsers.registerUser(USER);
    USER.id = registeredUser.user.id;
  });

  it("should return success", async () => {
    const refreshToken = await TestUsers.getRefreshToken(USER.username, USER.password);
    const ucEnv = await TestService.getUcEnv("user/logout");
    ucEnv.request.signedCookies = {
      refreshToken,
    };

    await UserRoute.logout(ucEnv);

    expect(ucEnv.response.clearCookie).toHaveBeenCalledWith("refreshToken");
  });

  it("should check that refreshToken is invalid", async () => {
    const refreshToken = await TestUsers.getRefreshToken(USER.username, USER.password);
    const ucEnv = await TestService.getUcEnv("user/logout");
    ucEnv.request.signedCookies = {
      refreshToken,
    };

    await UserRoute.logout(ucEnv);

    const refreshUcEnv = await TestService.getUcEnv("user/refreshToken");
    refreshUcEnv.request.signedCookies = {
      refreshToken,
    };
    await AssertionService.assertThrows(
      () => UserRoute.refreshToken(refreshUcEnv),
      new UserRoute.ERRORS.RefreshTokenMismatch(),
    );
  });

  it("should perform global logout", async () => {
    const refreshTokenOne = await TestUsers.getRefreshToken(USER.username, USER.password);
    const refreshTokenTwo = await TestUsers.getRefreshToken(USER.username, USER.password);
    const ucEnv = await TestService.getUcEnv("user/logout", { global: true });
    ucEnv.request.signedCookies = {
      refreshToken: refreshTokenOne,
    };

    await UserRoute.logout(ucEnv);

    const refreshUcEnv = await TestService.getUcEnv("user/refreshToken");
    refreshUcEnv.request.signedCookies = {
      refreshToken: refreshTokenTwo,
    };
    await AssertionService.assertThrows(
      () => UserRoute.refreshToken(refreshUcEnv),
      new UserRoute.ERRORS.RefreshTokenMismatch(),
    );
  });

  it("should keep other refresh token valid", async () => {
    const refreshTokenOne = await TestUsers.getRefreshToken(USER.username, USER.password);
    const refreshTokenTwo = await TestUsers.getRefreshToken(USER.username, USER.password);
    const ucEnv = await TestService.getUcEnv("user/logout", { global: false });
    ucEnv.request.signedCookies = {
      refreshToken: refreshTokenOne,
    };

    await UserRoute.logout(ucEnv);

    const refreshUcEnv = await TestService.getUcEnv("user/refreshToken");
    refreshUcEnv.request.signedCookies = {
      refreshToken: refreshTokenTwo,
    };
    await UserRoute.refreshToken(refreshUcEnv);
  });

  it.todo("should check that the Bearer authentication token is invalid");

  it("should raise InvalidRefreshToken error", async () => {
    const ucEnv = await TestService.getUcEnv("user/logout");

    await AssertionService.assertThrows(() => UserRoute.logout(ucEnv), new UserRoute.ERRORS.InvalidRefreshToken());
  });
});
