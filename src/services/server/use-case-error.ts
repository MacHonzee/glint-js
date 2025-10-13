/**
 * Base error class for use case (business logic) errors.
 * Extends the standard Error class with additional properties for HTTP status codes,
 * error codes, and contextual parameters.
 *
 * The error code is automatically generated from the class name in camelCase format,
 * prefixed with "glint-js/".
 *
 * @example
 * class InvalidEmailError extends UseCaseError {
 *   constructor(email: string) {
 *     super("The provided email is invalid.", { email }, 400);
 *   }
 * }
 *
 * throw new InvalidEmailError("test@invalid");
 * // Error code will be: "glint-js/invalidEmailError"
 */
class UseCaseError extends Error {
  /** Error code in format "glint-js/{className}" */
  code: string;
  /** Additional error parameters for context */
  params?: object;
  /** HTTP status code (default: 400) */
  status: number;

  /**
   * Creates a new use case error.
   * @param message - Human-readable error message
   * @param params - Optional additional error parameters for debugging/logging
   * @param status - HTTP status code to return (default: 400 Bad Request)
   */
  constructor(message: string, params?: object, status: number = 400) {
    super(message);
    this.message = message;

    // Generate error code from class name (e.g., "UseCaseError" -> "glint-js/useCaseError")
    const className = this.constructor.name;
    const code = className.charAt(0).toLowerCase() + className.slice(1);
    this.code = "glint-js/" + code;

    this.params = params;
    this.status = status;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default UseCaseError;
