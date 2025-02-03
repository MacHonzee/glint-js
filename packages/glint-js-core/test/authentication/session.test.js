import { describe, it, expect } from "@jest/globals";
import Session from "../../src/authentication/session.js";

describe("Session", () => {
  it("should create a session with required properties", () => {
    const sessionData = {
      id: "123",
      user: {
        username: "test@test.com",
        firstName: "Test",
        lastName: "User"
      },
      tokenIat: 1234567890,
      tokenExp: 1234567899
    };

    const session = new Session(sessionData);

    expect(session).toMatchObject({
      authenticated: true,
      id: "123",
      ts: expect.any(Date),
      user: {
        username: "test@test.com",
        firstName: "Test",
        lastName: "User"
      },
      tokenIat: 1234567890,
      tokenExp: 1234567899
    });
  });
});

