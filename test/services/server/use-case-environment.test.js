import { describe, beforeEach, it, expect } from "@jest/globals";
import { UseCaseEnvironment } from "../../../src/index";

describe("UseCaseEnvironment", () => {
  let req, res;

  beforeEach(() => {
    req = {
      protocol: "http",
      host: "localhost:3000",
      url: "/api/users?sortBy=name&page=1",
      originalUrl: "/api/users?sortBy=name",
      query: { sortBy: "name", page: "1" },
      body: { firstName: "John", lastName: "Doe" },
      files: {},
    };

    res = {};
  });

  describe("constructor", () => {
    it("should create a new instance of UseCaseEnvironment", () => {
      const ucEnv = new UseCaseEnvironment(req, res);

      expect(ucEnv).toBeInstanceOf(UseCaseEnvironment);
      expect(ucEnv.request).toBe(req);
      expect(ucEnv.response).toBe(res);
      expect(ucEnv.dtoIn).toEqual({ sortBy: "name", page: "1", firstName: "John", lastName: "Doe" });
      const uri = new URL("http://localhost:3000/api/users?sortBy=name");
      uri.useCase = "/api/users";
      expect(ucEnv.uri).toEqual(uri);
    });
  });

  describe("mapping", () => {
    it("should set and get the mapping property", () => {
      const ucEnv = new UseCaseEnvironment(req, res);
      const mapping = { url: "/api/users", method: "GET", controller: "getUsers" };

      ucEnv.mapping = mapping;
      expect(ucEnv.mapping).toBe(mapping);
    });
  });

  describe("session", () => {
    it("should set and get the session property", () => {
      const ucEnv = new UseCaseEnvironment(req, res);
      const session = { user: { id: 123, name: "John Doe" } };

      ucEnv.session = session;
      expect(ucEnv.session).toBe(session);
    });
  });

  describe("authorizationResult", () => {
    it("should set and get the authorizationResult property", () => {
      const ucEnv = new UseCaseEnvironment(req, res);
      const authorizationResult = { allowed: true };

      ucEnv.authorizationResult = authorizationResult;
      expect(ucEnv.authorizationResult).toBe(authorizationResult);
    });
  });
});
