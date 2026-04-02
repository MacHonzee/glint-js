import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { Config, SecretManager } from "../../../src/index";

jest.spyOn(Config, "get");
jest.spyOn(Config, "mustGet");
jest.spyOn(SecretManagerServiceClient.prototype, "accessSecretVersion");

// Authored by ChatGPT
describe("SecretManager", () => {
  beforeEach(() => {
    Config.get.mockReturnValueOnce("./test/services/secret-manager/keyfile.json");
    Config.mustGet.mockReturnValueOnce("project-id");

    SecretManager.client = new SecretManagerServiceClient();
    SecretManager.gcpProject = "project-id";
    SecretManager._active = true;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("get", () => {
    it("should return the cached secret if it exists", async () => {
      SecretManager._cachedSecrets = {
        "projects/project-id/secrets/secret-name/versions/version": "cached-secret",
      };

      const secret = await SecretManager.get("secret-name", "version");
      expect(secret).toEqual("cached-secret");
    });

    it("should get the secret from Google Secret Manager if it is not cached", async () => {
      SecretManager._cachedSecrets = {};

      const secret = {
        payload: {
          data: "my-secret",
        },
      };

      SecretManager.client.accessSecretVersion.mockResolvedValueOnce([secret]);

      const result = await SecretManager.get("secret-name", "version");
      expect(result).toEqual("my-secret");
      expect(SecretManager.client.accessSecretVersion).toHaveBeenCalledTimes(1);
      expect(SecretManager.client.accessSecretVersion).toHaveBeenCalledWith({
        name: "projects/project-id/secrets/secret-name/versions/version",
      });
    });
  });

  describe("getSecretPath", () => {
    it("should return the correct secret path", async () => {
      const result = await SecretManager.getSecretPath("secret-name", "version");
      expect(result).toEqual("projects/project-id/secrets/secret-name/versions/version");
    });
  });

  describe("mustGet", () => {
    it("should return the secret when it exists", async () => {
      SecretManager._cachedSecrets = {
        "projects/project-id/secrets/my-secret/versions/latest": "the-secret-value",
      };

      const secret = await SecretManager.mustGet("my-secret");
      expect(secret).toEqual("the-secret-value");
    });

    it("should throw if get returns undefined", async () => {
      jest.spyOn(SecretManager, "get").mockResolvedValueOnce(undefined);
      await expect(SecretManager.mustGet("nonexistent", "v1")).rejects.toThrow(
        "Secret nonexistent in version v1 was not found.",
      );
    });
  });

  describe("lazy initialization", () => {
    it("should call _init in get when not active", async () => {
      SecretManager._active = false;
      const initSpy = jest.spyOn(SecretManager, "_init").mockImplementation(() => {
        SecretManager._active = true;
        SecretManager.gcpProject = "project-id";
        SecretManager._cachedSecrets = {
          "projects/project-id/secrets/lazy-secret/versions/latest": "lazy-value",
        };
      });

      const result = await SecretManager.get("lazy-secret");
      expect(initSpy).toHaveBeenCalled();
      expect(result).toBe("lazy-value");
      initSpy.mockRestore();
    });

    it("should call _init in getSecretPath when not active", async () => {
      SecretManager._active = false;
      const initSpy = jest.spyOn(SecretManager, "_init").mockImplementation(() => {
        SecretManager._active = true;
        SecretManager.gcpProject = "project-id";
        SecretManager._cachedSecrets = {};
      });

      const path = await SecretManager.getSecretPath("test-secret");
      expect(initSpy).toHaveBeenCalled();
      expect(path).toBe("projects/project-id/secrets/test-secret/versions/latest");
      initSpy.mockRestore();
    });
  });

  describe("_init", () => {
    it("should initialize the client and cache", async () => {
      await SecretManager._init();
      expect(SecretManager.gcpProject).toEqual("project-id");
      expect(SecretManager.client).toBeDefined();
      expect(SecretManager._cachedSecrets).toEqual({});
    });
  });
});
