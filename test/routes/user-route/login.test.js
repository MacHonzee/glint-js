import { describe, it, beforeAll, expect } from "@jest/globals";
import TestService from "../../test-utils/test-service.js";
import AuthenticationService from "../../../src/services/authentication/authentication-service.js";
import AssertionService from "../../test-utils/assertion-service.js";
import TestUsers from "../../test-utils/test-users.js";

const USER = {
  username: "userForLogin@mail.com",
  password: "!SDFjihfsd51",
  confirmPassword: "!SDFjihfsd51",
  firstName: "Helena",
  lastName: "Carter",
  email: "userForLogin@mail.com",
  language: "cs",
};

describe("user/login", () => {
  let UserRoute;
  beforeAll(async () => {
    UserRoute = (await import("../../../src/routes/user-route.js")).default;
    await AuthenticationService.init();
    await TestUsers.registerUser(USER);
  });

  it("should return success", async () => {
    const data = {
      username: USER.username,
      password: USER.password,
    };
    const ucEnv = await TestService.getUcEnv("user/login", data);
    const dtoOut = await UserRoute.login(ucEnv);

    AssertionService.assertToken(dtoOut.token);
    AssertionService.assertUser(dtoOut.user, USER);
  });

  it("should raise error LoginFailed", async () => {
    const data = {
      username: "ownUser@mail.com",
      password: "invalidPassword",
    };
    const ucEnv = await TestService.getUcEnv("user/login", data);

    await AssertionService.assertThrows(
      () => UserRoute.login(ucEnv),
      new UserRoute.ERRORS.LoginFailed(expect.any(Error)),
    );
  });
});
