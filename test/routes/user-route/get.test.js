import { describe, it, beforeAll, expect } from "@jest/globals";
import { AuthenticationService } from "../../../src/index.js";
import { TestService, AssertionService } from "../../../src/test-utils/index.js";
import { TestUsers } from "../../test-utils/index.js";
import UserRoute from "../../../src/routes/user-route.js";

const USER = {
  username: "userforgetroute@mail.com",
  password: "456ZUGfsfsg",
  confirmPassword: "456ZUGfsfsg",
  firstName: "John",
  lastName: "Connors",
  email: "userforgetroute@mail.com",
  language: "en",
};

describe("user/get", () => {
  beforeAll(async () => {
    await AuthenticationService.init();
    const registeredUser = await TestUsers.registerUser(USER);
    USER.id = registeredUser.user.id;
  });

  it("should return user", async () => {
    const ucEnv = await TestService.getUcEnv("user/get", { username: USER.username }, { user: USER });

    const foundUser = await UserRoute.get(ucEnv);

    AssertionService.assertBaseData(foundUser);
    expect(foundUser).toMatchObject({
      id: USER.id,
      username: USER.username,
      firstName: USER.firstName,
      lastName: USER.lastName,
    });
    expect(foundUser).not.toHaveProperty("password");
    expect(foundUser).not.toHaveProperty("confirmPassword");
    expect(foundUser.salt).not.toBeDefined();
    expect(foundUser.hash).not.toBeDefined();
    expect(foundUser.resetToken).not.toBeDefined();
  });

  it("should raise error MismatchingPasswords", async () => {
    const userGetDtoIn = { username: "notexistinguser@email.com" };
    const ucEnv = await TestService.getUcEnv("user/get", userGetDtoIn, { user: USER });

    await AssertionService.assertThrows(
      () => UserRoute.get(ucEnv),
      new UserRoute.ERRORS.UserNotFound(userGetDtoIn.username),
    );
  });
});
