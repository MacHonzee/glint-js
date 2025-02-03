import { describe, it, beforeAll, expect } from "@jest/globals";
import { TestService, AssertionService } from "glint-js-kit";
import { TestUsers } from "../../test-utils/index.js";
import { AuthenticationService } from "../../../src/index.js";
import UserRoute from "../../../src/routes/user-route.js";

const USER = {
  username: "user_for_refresh_token@mail.com",
  password: "qwertzuiopú",
  confirmPassword: "qwertzuiopú",
  firstName: "Alex",
  lastName: "Honnold",
  email: "user_for_refresh_token@mail.com",
  language: "en",
};

describe("user/refreshToken", () => {
  beforeAll(async () => {
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
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.5h3MeiIYYw3FF856wkg0ukAH1cSgfN5NGXvhN9HmVwA",
    };

    await AssertionService.assertThrows(
      () => UserRoute.refreshToken(ucEnv),
      new UserRoute.ERRORS.RefreshTokenMismatch(),
    );
  });
});
