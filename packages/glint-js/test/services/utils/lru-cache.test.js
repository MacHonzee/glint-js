import { jest, describe, it, expect } from "@jest/globals";
import { LruCache } from "../../../src/index";

describe("LruCache", () => {
  describe("constructor", () => {
    it("should disable cache when max is 0", () => {
      const options = { max: 0, ttl: 1000, fetchMethod: jest.fn() };
      const cache = new LruCache(options);
      expect(cache.fetch).toEqual(options.fetchMethod);
    });

    it("should disable cache when ttl is 0", () => {
      const options = { max: 1000, ttl: 0, fetchMethod: jest.fn() };
      const cache = new LruCache(options);
      expect(cache.fetch).toEqual(options.fetchMethod);
    });

    it("should set max option when given a number", () => {
      const options = { max: "1000", ttl: 1000, fetchMethod: jest.fn() };
      const cache = new LruCache(options);
      expect(cache.max).toEqual(parseInt(options.max));
    });

    it("should set ttl option when given a number", () => {
      const options = { max: 1000, ttl: "1000", fetchMethod: jest.fn() };
      const cache = new LruCache(options);
      expect(cache.ttl).toEqual(options.ttl);
    });

    it("should set cache normally when given valid options", () => {
      const options = { max: 1000, ttl: 1000, fetchMethod: jest.fn() };
      const cache = new LruCache(options);
      expect(cache).toBeInstanceOf(LruCache);
    });
  });

  describe("fetch", () => {
    it("should call fetch method once to retrieve cached result", async () => {
      const options = { max: 1000, ttl: 1000, fetchMethod: jest.fn().mockResolvedValue("my-value") };
      const cache = new LruCache(options);
      const value = await cache.fetch("my-key");
      await cache.fetch("my-key");
      expect(options.fetchMethod).toBeCalledTimes(1);
      expect(value).toBe("my-value");
    });
  });
});
