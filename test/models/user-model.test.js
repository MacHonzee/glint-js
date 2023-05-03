import { describe, it, afterAll } from "@jest/globals";
import UserModel from "../../src/models/user-model.js";
import AssertionService from "../test-utils/assertion-service.js";

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