import { jest, describe, it, expect } from "@jest/globals";
import { AuthorizationService, AuthorizationResult, RouteRegister, DefaultRoles } from "../../../src/index";
import Permission from "../../../src/models/permission-model";

// mock dependencies
jest.spyOn(RouteRegister, "getRoute");
Permission.list = jest.fn(() => []);
Permission.listByUser = jest.fn(() => []);
Permission.deleteByUser = jest.fn();
Permission.delete = jest.fn();

describe("AuthorizationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuthorizationService._cache.clear();
  });

  describe("authorize", () => {
    it("should throw an error if roles are not defined for the use case", async () => {
      RouteRegister.getRoute.mockReturnValueOnce({ config: {} });

      await expect(AuthorizationService.authorize("useCase", "user")).rejects.toThrow(
        "Role configuration not found for use case useCase",
      );
    });

    it("should authorize user if authenticated role is required", async () => {
      RouteRegister.getRoute.mockReturnValueOnce({ config: { roles: [DefaultRoles.authenticated] } });

      const result = await AuthorizationService.authorize("useCase", "user");

      expect(result).toEqual(
        new AuthorizationResult({
          authorized: true,
          username: "user",
          useCaseRoles: [DefaultRoles.authenticated],
          userRoles: [],
        }),
      );
    });

    it("should authorize user if user has any required role", async () => {
      RouteRegister.getRoute.mockReturnValueOnce({ config: { roles: ["admin"] } });
      Permission.listByUser.mockReturnValueOnce([{ role: "admin" }]);

      const result = await AuthorizationService.authorize("useCase", "user");

      expect(result).toEqual(
        new AuthorizationResult({
          authorized: true,
          username: "user",
          useCaseRoles: ["admin"],
          userRoles: ["admin"],
        }),
      );
    });

    it("should not authorize user if user does not have required roles", async () => {
      RouteRegister.getRoute.mockReturnValueOnce({ config: { roles: ["admin"] } });
      Permission.listByUser.mockReturnValueOnce([{ role: "user" }]);

      const result = await AuthorizationService.authorize("useCase", "user");

      expect(result).toEqual(
        new AuthorizationResult({
          authorized: false,
          username: "user",
          useCaseRoles: ["admin"],
          userRoles: ["user"],
        }),
      );
    });
  });

  describe("getUserRoles", () => {
    it("should fetch user roles from cache", async () => {
      jest.spyOn(AuthorizationService._cache, "fetch").mockResolvedValueOnce(["admin"]);
      const result = await AuthorizationService.getUserRoles("user");

      expect(result).toEqual(["admin"]);
      expect(AuthorizationService._cache.fetch).toHaveBeenCalledWith("user");
    });
  });

  describe("clearUserCache", () => {
    it("should delete user from cache", () => {
      jest.spyOn(AuthorizationService._cache, "delete");
      AuthorizationService.clearUserCache("user");

      expect(AuthorizationService._cache.delete).toHaveBeenCalledWith("user");
    });
  });

  describe("_fetchUserRoles", () => {
    it("should fetch user roles from Permission model", async () => {
      Permission.listByUser.mockResolvedValueOnce([{ role: "admin" }]);

      const result = await AuthorizationService._fetchUserRoles("user");

      expect(result).toEqual(["admin"]);
      expect(Permission.listByUser).toHaveBeenCalledWith("user");
    });
  });
});
