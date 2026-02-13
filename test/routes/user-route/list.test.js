import { describe, it, beforeAll, expect } from "@jest/globals";
import { TestUsers } from "../../test-utils/index.js";
import { AuthenticationService } from "../../../src/index.js";
import { TestService } from "../../../src/test-utils/index.js";
import UserRoute from "../../../src/routes/user-route.js";

const USER = {
  username: "userforlist@mail.com",
  password: "listPassword123",
  confirmPassword: "listPassword123",
  firstName: "List",
  lastName: "Tester",
  email: "userforlist@mail.com",
  language: "en",
};

describe("user/list", () => {
  beforeAll(async () => {
    await AuthenticationService.init();
    await TestUsers.registerUser(USER);
  });

  it("should return list of users", async () => {
    const ucEnv = await TestService.getUcEnv("user/list", {});
    const dtoOut = await UserRoute.list(ucEnv);

    expect(dtoOut).toHaveProperty("users");
    expect(dtoOut.users).toBeInstanceOf(Array);
    expect(dtoOut.users.length).toBeGreaterThan(0);

    // Verify users have expected structure
    const foundUser = dtoOut.users.find((u) => u.username === USER.username);
    expect(foundUser).toBeDefined();
    expect(foundUser.firstName).toBe(USER.firstName);
    expect(foundUser.lastName).toBe(USER.lastName);
  });

  it("should return list of users with permissions when withPermissions is true", async () => {
    const ucEnv = await TestService.getUcEnv("user/list", { withPermissions: true });
    const dtoOut = await UserRoute.list(ucEnv);

    expect(dtoOut).toHaveProperty("users");
    expect(dtoOut.users).toBeInstanceOf(Array);
    expect(dtoOut.users.length).toBeGreaterThan(0);
  });

  it("should return list of users without permissions when withPermissions is false", async () => {
    const ucEnv = await TestService.getUcEnv("user/list", { withPermissions: false });
    const dtoOut = await UserRoute.list(ucEnv);

    expect(dtoOut).toHaveProperty("users");
    expect(dtoOut.users).toBeInstanceOf(Array);
    expect(dtoOut.users.length).toBeGreaterThan(0);
  });
});
