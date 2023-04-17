import { describe, it, beforeAll, expect } from "@jest/globals";
import TestService from "../../test-utils/test-service.js";
import AuthenticationService from "../../../src/services/authentication/authentication-service.js";
import AssertionService from "../../test-utils/assertion-service.js";
import TestUsers from "../../test-utils/test-users.js";

const USER = {
  username: "userForRefreshToken@mail.com",
  password: "qwertzuiopú",
  confirmPassword: "qwertzuiopú",
  firstName: "Alex",
  lastName: "Honnold",
  email: "userForRefreshToken@mail.com",
  language: "en",
};

describe("user/refreshToken", () => {
  let UserRoute;
  beforeAll(async () => {
    UserRoute = (await import("../../../src/routes/user-route.js")).default;
    await AuthenticationService.init();
    const registeredUser = await TestUsers.registerUser(USER);
    USER.id = registeredUser.user.id;
  });

  it("should return success", async () => {
    const refreshToken = await TestUsers.getRefreshToken(USER.username, USER.password);

    const ucEnv = await TestService.getUcEnv("user/refreshToken");
    ucEnv.request.signedCookies = {
      refreshToken: refreshToken,
    };

    const dtoOut = await UserRoute.refreshToken(ucEnv);

    AssertionService.assertToken(dtoOut.token);
    expect(dtoOut.user).toMatchObject({
      id: USER.id,
      username: USER.username,
      firstName: USER.firstName,
      lastName: USER.lastName,
    });
    expect(ucEnv.response.cookie).toHaveBeenCalled();
  });

  it("should raise InvalidRefreshToken error", async () => {
    const ucEnv = await TestService.getUcEnv("user/refreshToken");

    await AssertionService.assertThrows(
      () => UserRoute.refreshToken(ucEnv),
      new UserRoute.ERRORS.InvalidRefreshToken(),
    );
  });

  it("should raise RefreshTokenMismatch because token was not found", async () => {
    const ucEnv = await TestService.getUcEnv("user/refreshToken");
    ucEnv.request.signedCookies = {
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0aWQiOiI2NDNkMWRkNjk2YTJjNTlmZDk5MGEwMWIiLCJ1c2VyIjp7ImlkIjoiNjQzZDFkZDU5NmEyYzU5ZmQ5OTBhMDEzIiwidXNlcm5hbWUiOiJ1c2VyRm9yUmVmcmVzaFRva2VuQG1haWwuY29tIiwiZmlyc3ROYW1lIjoiQWxleCIsImxhc3ROYW1lIjoiSG9ubm9sZCJ9LCJpYXQiOjE2ODE3MjY5MzQsImV4cCI6MTY4NDMxODkzNH0.MKTddHNEbcjSbOlNFkPRsu1zdxNy1lI5A0TDAhZHTzk",
    };

    await AssertionService.assertThrows(
      () => UserRoute.refreshToken(ucEnv),
      new UserRoute.ERRORS.RefreshTokenMismatch(),
    );
  });
});
