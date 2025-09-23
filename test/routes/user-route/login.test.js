import { describe, it, beforeAll, expect } from "@jest/globals";
import { TestUsers } from "../../test-utils/index.js";
import { AuthenticationService } from "../../../src/index.js";
import { TestService, AssertionService } from "../../../src/test-utils/index.js";
import UserRoute from "../../../src/routes/user-route.js";

const USER = {
  username: "user_for_login@mail.com",
  password: "!SDFjihfsd51",
  confirmPassword: "!SDFjihfsd51",
  firstName: "Helena",
  lastName: "Carter",
  email: "user_for_login@mail.com",
  language: "cs",
};

describe("user/login", () => {
  beforeAll(async () => {
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
