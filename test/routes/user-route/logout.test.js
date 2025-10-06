import { describe, it, beforeAll, expect } from "@jest/globals";
import { TestUsers } from "../../test-utils/index.js";
import { AuthenticationService } from "../../../src/index.js";
import { TestService, AssertionService } from "../../../src/test-utils/index.js";
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
    const { refreshToken } = await TestUsers.getRefreshToken(USER.username, USER.password);
    const ucEnv = await TestService.getUcEnv("user/logout");
    ucEnv.request.signedCookies = {
      refreshToken,
    };

    await UserRoute.logout(ucEnv);

    expect(ucEnv.response.clearCookie).toHaveBeenCalledWith("refreshToken");
  });

  it("should check that refreshToken is invalid", async () => {
    const { refreshToken, csrfToken } = await TestUsers.getRefreshToken(USER.username, USER.password);
    const ucEnv = await TestService.getUcEnv("user/logout");
    ucEnv.request.signedCookies = {
      refreshToken,
    };

    await UserRoute.logout(ucEnv);

    const refreshUcEnv = await TestService.getUcEnv("user/refreshToken");
    refreshUcEnv.request.signedCookies = {
      refreshToken,
    };
    refreshUcEnv.request.headers["x-xsrf-token"] = csrfToken;
    await AssertionService.assertThrows(
      () => UserRoute.refreshToken(refreshUcEnv),
      new UserRoute.ERRORS.RefreshTokenMismatch(),
    );
  });

  it("should perform global logout", async () => {
    const { refreshToken: refreshTokenOne, csrfToken: csrfTokenOne } = await TestUsers.getRefreshToken(
      USER.username,
      USER.password,
    );
    const { refreshToken: refreshTokenTwo, csrfToken: csrfTokenTwo } = await TestUsers.getRefreshToken(
      USER.username,
      USER.password,
    );
    const ucEnv = await TestService.getUcEnv("user/logout", { global: true });
    ucEnv.request.signedCookies = {
      refreshToken: refreshTokenOne,
    };

    await UserRoute.logout(ucEnv);

    const refreshUcEnv = await TestService.getUcEnv("user/refreshToken");
    refreshUcEnv.request.signedCookies = {
      refreshToken: refreshTokenTwo,
    };
    refreshUcEnv.request.headers["x-xsrf-token"] = csrfTokenTwo;
    await AssertionService.assertThrows(
      () => UserRoute.refreshToken(refreshUcEnv),
      new UserRoute.ERRORS.RefreshTokenMismatch(),
    );
  });

  it("should keep other refresh token valid", async () => {
    const { refreshToken: refreshTokenOne, csrfToken: csrfTokenOne } = await TestUsers.getRefreshToken(
      USER.username,
      USER.password,
    );
    const { refreshToken: refreshTokenTwo, csrfToken: csrfTokenTwo } = await TestUsers.getRefreshToken(
      USER.username,
      USER.password,
    );
    const ucEnv = await TestService.getUcEnv("user/logout", { global: false });
    ucEnv.request.signedCookies = {
      refreshToken: refreshTokenOne,
    };

    await UserRoute.logout(ucEnv);

    const refreshUcEnv = await TestService.getUcEnv("user/refreshToken");
    refreshUcEnv.request.signedCookies = {
      refreshToken: refreshTokenTwo,
    };
    refreshUcEnv.request.headers["x-xsrf-token"] = csrfTokenTwo;
    await UserRoute.refreshToken(refreshUcEnv);
  });

  it.todo("should check that the Bearer authentication token is invalid");

  it("should raise InvalidRefreshToken error", async () => {
    const ucEnv = await TestService.getUcEnv("user/logout");

    await AssertionService.assertThrows(() => UserRoute.logout(ucEnv), new UserRoute.ERRORS.InvalidRefreshToken());
  });
});
