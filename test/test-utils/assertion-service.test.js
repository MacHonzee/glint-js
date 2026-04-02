import { describe, it, expect } from "@jest/globals";
import { AssertionService, TestService } from "../../src/test-utils/index.js";
import { mongoose } from "../../src/index.js";

describe("AssertionService", () => {
  describe("assertBaseData", () => {
    it("should accept string ObjectId", () => {
      AssertionService.assertBaseData({
        _id: "507f1f77bcf86cd799439011",
        __v: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("should accept Mongoose ObjectId", () => {
      AssertionService.assertBaseData({
        _id: new mongoose.Types.ObjectId(),
        __v: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it("should skip timestamps when skipTimestamps option is set", () => {
      AssertionService.assertBaseData(
        {
          _id: "507f1f77bcf86cd799439011",
          __v: 0,
        },
        { skipTimestamps: true },
      );
    });
  });

  describe("assertCallThrows", () => {
    it("should throw when the call does not raise an error", async () => {
      await expect(
        AssertionService.assertCallThrows(
          () => Promise.resolve({ status: 200 }),
          () => {},
        ),
      ).rejects.toThrow("Should have raised error but did not.");
    });

    it("should handle error returned in response.error", async () => {
      const mockError = new Error("test error");
      mockError.response = { status: 400, data: { message: "bad request" } };

      let capturedResponse;
      await AssertionService.assertCallThrows(
        () => Promise.resolve({ error: mockError, response: mockError.response }),
        (response) => {
          capturedResponse = response;
        },
      );

      expect(capturedResponse).toEqual({ status: 400, data: { message: "bad request" } });
    });
  });

  describe("assertThrows", () => {
    it("should throw when the asserted function does not throw", async () => {
      await expect(AssertionService.assertThrows(() => Promise.resolve(), new Error("expected"))).rejects.toThrow(
        "Should have raised error but did not.",
      );
    });
  });

  describe("assertToken", () => {
    it("should accept a valid JWT token format", () => {
      const token = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiZm9vIn0.abc123";
      AssertionService.assertToken(token);
    });
  });
});

describe("TestService", () => {
  describe("getUcEnv", () => {
    it("should accept user as an async function", async () => {
      const userFn = async () => ({ user: { id: "123", email: "fn@test.com" } });
      const ucEnv = await TestService.getUcEnv("sys/ping", {}, userFn);
      expect(ucEnv.session).toBeDefined();
    });

    it("should accept user as a plain object (not a function)", async () => {
      const userData = { user: { id: "456", email: "obj@test.com" } };
      const ucEnv = await TestService.getUcEnv("sys/ping", {}, userData);
      expect(ucEnv.session).toBeDefined();
    });
  });
});
