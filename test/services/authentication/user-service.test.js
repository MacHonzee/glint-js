import { jest, describe, it, expect } from "@jest/globals";
import { UserService } from "../../../src/index";
import UserModel from "../../../src/models/user-model";

UserModel.findByUsername = jest.fn();
UserModel.findById = jest.fn();

describe("UserService", () => {
  describe("findByUsername", () => {
    it("should call UserModel.findByUsername with the given username", async () => {
      const username = "testuser";
      await UserService.findByUsername(username);
      expect(UserModel.findByUsername).toHaveBeenCalledWith(username);
    });

    it("should return the result of UserModel.findByUsername", async () => {
      const user = { _id: "123", username: "testuser" };
      UserModel.findByUsername.mockResolvedValue(user);
      const result = await UserService.findByUsername(user.username);
      expect(result).toEqual(user);
    });
  });

  describe("findById", () => {
    it("should call UserModel.findById with the given id", async () => {
      const id = "123";
      await UserService.findById(id);
      expect(UserModel.findById).toHaveBeenCalledWith(id);
    });

    it("should return the result of UserModel.findById", async () => {
      const user = { _id: "123", username: "testuser" };
      UserModel.findById.mockResolvedValue(user);
      const result = await UserService.findById(user._id);
      expect(result).toEqual(user);
    });
  });
});
