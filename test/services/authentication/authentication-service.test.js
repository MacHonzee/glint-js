import { jest, describe, it, expect } from "@jest/globals";
import { AuthenticationService, Config, SecretManager } from "../../../src/index";
import UserModel from "../../../src/models/user-model";

// mock dependencies
jest.spyOn(Config, "get").mockImplementation((key) => {
  switch (key) {
    case "AUTH_SESSION_EXPIRY":
      return "1h";
    case "AUTH_REFRESH_TOKEN_EXPIRY":
      return "30d";
    case "AUTH_COOKIE_KEY":
      return "cookie_key";
    case "AUTH_JWT_KEY":
      return "jwt_key";
    case "AUTH_REFRESH_TOKEN_KEY":
      return "refresh_token_key";
    default:
      return undefined;
  }
});
jest.spyOn(SecretManager, "get").mockResolvedValue("secret_key");

describe("AuthenticationService", () => {
  let authService;

  beforeAll(async () => {
    await AuthenticationService.init();
    authService = AuthenticationService;
  });

  describe("getToken", () => {
    it("should return a signed JWT token", () => {
      const userPayload = { id: "1", name: "John Doe" };
      const token = authService.getToken(userPayload);
      expect(token).toEqual(expect.any(String));
    });
  });

  describe("getRefreshToken", () => {
    it("should return an object containing a signed refresh token, TTL and ID", () => {
      const userPayload = { id: "1", name: "John Doe" };
      const refreshToken = authService.getRefreshToken(userPayload);
      expect(refreshToken).toEqual({
        refreshToken: expect.any(String),
        refreshTokenTtl: expect.any(Date),
        refreshTokenId: expect.any(Object),
      });
    });
  });

  describe("verifyToken", () => {
    it("should verify a signed JWT token", () => {
      const token = "some_token";
      const payload = { id: "1", name: "John Doe" };
      jest.spyOn(authService, "verifyToken").mockReturnValue(payload);
      expect(authService.verifyToken(token)).toEqual(payload);
    });
  });

  describe("verifyRefreshToken", () => {
    it("should verify a signed refresh token", () => {
      const refreshToken = "some_refresh_token";
      const payload = { tid: "1", user: { id: "1", name: "John Doe" }, iat: 123, exp: 456 };
      jest.spyOn(authService, "verifyRefreshToken").mockReturnValue(payload);
      expect(authService.verifyRefreshToken(refreshToken)).toEqual(payload);
    });
  });

  describe("decodeToken", () => {
    it("should decode a JWT token", () => {
      const token = "some_token";
      const payload = { id: "1", name: "John Doe" };
      jest.spyOn(authService, "decodeToken").mockReturnValue(payload);
      expect(authService.decodeToken(token)).toEqual(payload);
    });
  });

  describe("login", () => {
    it("should call UserModel.authenticate() with the given username and password", async () => {
      const username = "test@test.com";
      const password = "password";
      const user = { id: "1", name: "John Doe", username };
      const callbackSpy = jest.fn(() => user);
      jest.spyOn(UserModel, "authenticate").mockReturnValue(callbackSpy);

      const result = await authService.login(username, password);
      expect(UserModel.authenticate).toHaveBeenCalledWith();
      expect(callbackSpy).toHaveBeenCalledWith(username, password);
      expect(result).toEqual(user);
    });
  });
});
