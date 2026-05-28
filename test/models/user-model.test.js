import { describe, it, afterAll, expect } from "@jest/globals";
import { AssertionService } from "../../src/test-utils/index.js";
import UserModel from "../../src/models/user-model.js";

afterAll(async () => {
  await UserModel.db.close();
});

describe("UserModel", () => {
  it("should register extra indexes via registerMetadataIndex", () => {
    UserModel.registerMetadataIndex(
      { "metadata.__glintTestIndex": 1 },
      { unique: true, partialFilterExpression: { "metadata.__glintTestIndex": { $exists: true } } },
    );
    const indexes = UserModel.schema.indexes();
    expect(indexes.some((spec) => spec[0] && spec[0]["metadata.__glintTestIndex"] === 1)).toBe(true);
  });

  it("should allow schema configuration via configureUserSchema", () => {
    const callback = (schema) => {
      schema.index({ email: 1 });
    };
    expect(() => UserModel.configureUserSchema(callback)).not.toThrow();
  });

  it("should throw TypeError when configureUserSchema receives non-function", () => {
    expect(() => UserModel.configureUserSchema("not a function")).toThrow(TypeError);
    expect(() => UserModel.configureUserSchema("not a function")).toThrow(
      "configureUserSchema(callback): callback must be a function",
    );
  });

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

  it("should set lastLoginTs via recordLastLogin", async () => {
    const registeredUser = await UserModel.register(
      new UserModel({
        username: "lastLoginUser@mail.com",
        firstName: "Last",
        lastName: "Login",
        email: "lastLoginUser@mail.com",
      }),
      "superPassword",
    );

    const before = Date.now();
    const updatedUser = await UserModel.recordLastLogin(registeredUser._id);
    const after = Date.now();

    expect(updatedUser.lastLoginTs).toBeInstanceOf(Date);
    expect(updatedUser.lastLoginTs.getTime()).toBeGreaterThanOrEqual(before);
    expect(updatedUser.lastLoginTs.getTime()).toBeLessThanOrEqual(after);
    expect(updatedUser.hash).toBeUndefined();
    expect(updatedUser.salt).toBeUndefined();
  });
});
