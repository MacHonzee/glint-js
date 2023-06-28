import { describe, it, beforeAll } from "@jest/globals";
import AuthenticationService from "../../../src/services/authentication/authentication-service.js";
import AssertionService from "../../test-utils/assertion-service.js";
import TestUsers from "../../test-utils/test-users.js";

describe("user/register", () => {
  let UserRoute;
  beforeAll(async () => {
    UserRoute = (await import("../../../src/routes/user-route.js")).default;
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

    await AssertionService.assertThrows(
      () => TestUsers.registerUser(data),
      new UserRoute.ERRORS.RegistrationFailed(
        "UserExistsError",
        "A user with the given username is already registered",
      ),
    );
  });
});
