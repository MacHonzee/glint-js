import { describe, it, expect } from "@jest/globals";
import Uri from "../../src/server/uri.js";

describe("Uri", () => {
  it("should create a Uri instance from absolute URL", () => {
    const uri = new Uri("https://example.com/test/path?query=value");
    
    expect(uri.href).toBe("https://example.com/test/path?query=value");
    expect(uri.pathname).toBe("/test/path");
    expect(uri.useCase).toBe("/test/path");
    expect(uri.searchParams.get("query")).toBe("value");
  });

  it("should create a Uri instance from relative path with base", () => {
    const uri = new Uri("/test/path", "https://example.com");
    
    expect(uri.href).toBe("https://example.com/test/path");
    expect(uri.pathname).toBe("/test/path");
    expect(uri.useCase).toBe("/test/path");
  });

  it("should throw error for invalid URL", () => {
    expect(() => new Uri("invalid-url")).toThrow();
  });
}); 