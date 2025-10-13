import { expect } from "@jest/globals";
import { mongoose } from "../index.js";

/**
 * Callback type for asserting error responses
 */
type AssertErrorCallback = (response: any, error: Error) => void;

/**
 * Service for common test assertions used across unit tests.
 * Provides utilities for asserting errors, tokens, MongoDB data structures, and user objects.
 */
class AssertionService {
  /**
   * Asserts whether given call to server raises an error and checks the error
   *
   * @param call - Function that performs the server call
   * @param assertThrow - Callback to assert the thrown error
   */
  async assertCallThrows(call: () => Promise<any>, assertThrow: AssertErrorCallback): Promise<void> {
    let response: any;
    try {
      response = await call();
    } catch (e: any) {
      assertThrow(e.response, e);
      return;
    }

    if (response.error) {
      assertThrow(response.response, response.error);
      return;
    }

    throw new Error("Should have raised error but did not.");
  }

  /**
   * Asserts that the string matches JWT format
   *
   * @param token - JWT token string to validate
   */
  assertToken(token: string): void {
    expect(token).toMatch(/^[\w-]*\.[\w-]*\.[\w-]*$/);
  }

  /**
   * Checks that the object contains standard MongoDB attributes
   *
   * @param dataObject - Object to check
   * @param options - Additional options
   * @param options.skipTimestamps - Whether to skip checking timestamps
   */
  assertBaseData(dataObject: any, options: { skipTimestamps?: boolean } = {}): void {
    expect(dataObject).toBeDefined();

    // check version
    expect(typeof dataObject.__v).toBe("number");
    expect(dataObject.__v).toBeGreaterThanOrEqual(0);

    // both string and ObjectId is valid
    if (typeof dataObject._id === "string") {
      expect(dataObject._id).toMatch(/^[a-f0-9]{24}$/);
    } else {
      expect(dataObject._id).toBeInstanceOf(mongoose.Types.ObjectId);
    }

    // check timestamps
    if (!options.skipTimestamps) {
      expect(dataObject.createdAt).toBeInstanceOf(Date);
      expect(dataObject.updatedAt).toBeInstanceOf(Date);
    }
  }

  /**
   * Checks whether the returned user matches the expected user
   *
   * @param responseUser - User object from response
   * @param expectedUser - Expected user data
   */
  assertUser(responseUser: any, expectedUser: any): void {
    this.assertBaseData(responseUser);

    const data = {
      username: expectedUser.username,
      firstName: expectedUser.firstName,
      lastName: expectedUser.lastName,
      email: expectedUser.email,
      language: expectedUser.language,
      authStrategy: "local",
    };

    expect(responseUser).toMatchObject(data);
    expect(responseUser.hash).not.toBeDefined();
    expect(responseUser.salt).not.toBeDefined();
  }

  /**
   * Asserts that an async function throws a specific error
   *
   * @param assertedFunction - Function to test
   * @param expectedError - Expected error with message, code, status, and params
   */
  async assertThrows(assertedFunction: () => Promise<any>, expectedError: any): Promise<void> {
    let hasThrown = false;
    try {
      await assertedFunction();
    } catch (e: any) {
      hasThrown = true;

      expect(e.message).toBe(expectedError.message);
      expect(e.code).toBe(expectedError.code);
      expect(e.status).toBe(expectedError.status);
      expect(e.params).toEqual(expectedError.params);
    }

    if (!hasThrown) throw new Error("Should have raised error but did not.");
  }
}

export default new AssertionService();
