import { describe, it, afterAll } from "@jest/globals";
import { AssertionService } from "glint-js-kit";
import UserModel from "../../src/models/user-model.js";

afterAll(async () => {
  await UserModel.db.close();
});

describe("UserModel", () => {
  it("should not return hash and salt in JSON", async () => {
    const newUser = new UserModel({
      username: "testUserFromModel",
      firstName: "Laura",
      lastName: "Mňoukatá",
      language: "cs",
      email: "testUserFromModel",
    });

    // save user to database to check constraints
    const registeredUser = await UserModel.register(newUser, "superPassword");
    const foundUser = await UserModel.findById(registeredUser.id);
    const jsonUser = foundUser.toJSON();

    AssertionService.assertUser(jsonUser, newUser);
  });
});
