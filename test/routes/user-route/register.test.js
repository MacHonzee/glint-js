import { describe, it, beforeAll } from "@jest/globals";
import { AssertionService } from "glint-js-kit";
import { TestUsers } from "../../test-utils/index.js";
import { AuthenticationService } from "../../../src/index.js";
import UserRoute from "../../../src/routes/user-route.js";
import TestService from "glint-js-kit/src/test-utils/test-service.js";

describe("user/register", () => {
  beforeAll(async () => {
    await AuthenticationService.init();
  });

  it("should return success", async () => {
    const data = {
      username: "ownuser@mail.com",
      password: "ultraStrongPass123",
      confirmPassword: "ultraStrongPass123",
      firstName: "John",
      lastName: "Malkovich",
      email: "ownUser@mail.com",
      language: "en",
    };
    const dtoOut = await TestUsers.registerUser(data);

    AssertionService.assertToken(dtoOut.token);
    AssertionService.assertUser(dtoOut.user, data);
  });

  it("should raise error MismatchingPasswords", async () => {
    const data = {
      username: "ownUser@mail.com",
      password: "ultraStrongPass123",
      confirmPassword: "mismatchingPassword",
      firstName: "John",
      lastName: "Malkovich",
      email: "ownUser@mail.com",
      language: "en",
    };

    await AssertionService.assertThrows(
      () => TestUsers.registerUser(data),
      new UserRoute.ERRORS.MismatchingPasswords(),
    );
  });

  it("should raise error RegistrationFailed for duplicate users", async () => {
    const data = {
      username: "ownUser@mail.com",
      password: "ultraStrongPass123",
      confirmPassword: "ultraStrongPass123",
      firstName: "John",
      lastName: "Malkovich",
      email: "ownUser@mail.com",
      language: "en",
    };

    const ucEnv = await TestService.getUcEnv("user/register", data);
    await AssertionService.assertThrows(
      () => UserRoute.register(ucEnv),
      new UserRoute.ERRORS.RegistrationFailed(
        "UserExistsError",
        "A user with the given username is already registered",
      ),
    );
  });
});
