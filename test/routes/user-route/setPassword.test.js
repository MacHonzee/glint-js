import { describe, it, beforeAll, expect } from "@jest/globals";
import { TestService } from "glint-js-kit";
import { TestUsers } from "../../test-utils/index.js";
import { AuthenticationService } from "../../../src/index.js";
import UserRoute from "../../../src/routes/user-route.js";

const USER = {
  username: "userforsetpassword@mail.com",
  password: "zsdgsdfgdsf",
  confirmPassword: "zsdgsdfgdsf",
  firstName: "Tom",
  lastName: "Smith",
  email: "userforsetpassword@mail.com",
  language: "en",
};

describe("user/setPassword", () => {
  beforeAll(async () => {
    await AuthenticationService.init();
    const registeredUser = await TestUsers.registerUser(USER);
    console.log("=>(setPassword.test.js:21) registeredUser", registeredUser);
    USER.id = registeredUser.user.id;
  });

  it("should return success", async () => {
    const setPassword = {
      username: USER.username,
      password: "someNewPassword",
    };
    const ucEnv = await TestService.getUcEnv("user/setPassword", setPassword);

    const dtoOut = await UserRoute.setPassword(ucEnv);
    expect(dtoOut.status).toEqual("OK");
    expect(dtoOut.user).toMatchObject({
      id: USER.id,
      username: USER.username,
      firstName: USER.firstName,
      lastName: USER.lastName,
    });

    // check that the new password can be used and the old one cannot be used
    const login = await AuthenticationService.login(USER.username, setPassword.password);
    expect(login).toBeTruthy();
    await expect(AuthenticationService.login(USER.username, USER.password)).resolves.toMatchObject({
      error: expect.anything(),
      user: false,
    });
  });
});
