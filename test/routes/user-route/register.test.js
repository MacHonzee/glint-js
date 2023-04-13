import { describe, it, beforeAll } from "@jest/globals";
import TestService from "../../test-utils/test-service.js";
import AuthenticationService from "../../../src/services/authentication/authentication-service.js";
import AssertionService from "../../test-utils/assertion-service.js";

describe("user/register", () => {
  let UserRoute;
  beforeAll(async () => {
    UserRoute = (await import("../../../src/routes/user-route.js")).default;
    await AuthenticationService.init();
  });

  it("should return success", async () => {
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
    const dtoOut = await UserRoute.register(ucEnv);

    AssertionService.assertToken(dtoOut.token);
    AssertionService.assertUser(dtoOut.user, data);
  });

  // TODO
  it.todo("should raise error MismatchingPasswords");

  // TODO
  it.todo("should raise error RegistrationFailed for duplicate users");
});
