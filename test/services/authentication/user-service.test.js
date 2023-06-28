import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { UserService } from "../../../src/index";
import UserModel from "../../../src/models/user-model";

jest.spyOn(UserModel, "findByUsername");
jest.spyOn(UserModel, "findById");

describe("UserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findByUsername", () => {
    it("should return the user when the user is found", async () => {
      const mockUser = { username: "Test", id: "1" };

      UserModel.findByUsername.mockResolvedValue(mockUser);

      const user = await UserService.findByUsername("Test");

      expect(UserModel.findByUsername).toBeCalledWith("Test");
      expect(user).toEqual(mockUser);
    });

    it("should throw an error when the user is not found", async () => {
      UserModel.findByUsername.mockResolvedValue(null);

      await expect(UserService.findByUsername("Test")).rejects.toThrow(UserService.ERRORS.UserNotFound);
      expect(UserModel.findByUsername).toBeCalledWith("Test");
    });
  });

  describe("findById", () => {
    it("should return the user when the user is found", async () => {
      const mockUser = { username: "Test", id: "1" };

      UserModel.findById.mockResolvedValue(mockUser);

      const user = await UserService.findById("1");

      expect(UserModel.findById).toBeCalledWith("1");
      expect(user).toEqual(mockUser);
    });

    it("should throw an error when the user is not found", async () => {
      UserModel.findById.mockResolvedValue(null);

      await expect(UserService.findById("1")).rejects.toThrow(UserService.ERRORS.UserNotFound);
      expect(UserModel.findById).toBeCalledWith("1");
    });
  });
});
