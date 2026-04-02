/**
 * Base error class for all use-case / business-logic errors in glint-js.
 * The `code` is auto-derived from the subclass name (e.g. `"glint-js/loginFailed"`).
 */
class UseCaseError extends Error {
  /**
   * @param {string} message
   * @param {object?} params
   * @param {number} [status = 400]
   */
  constructor(message, params, status = 400) {
    super();
    this.message = message;
    const code = this.constructor.name.slice(0, 1).toLowerCase() + this.constructor.name.slice(1);
    this.code = "glint-js/" + code;
    this.params = params;
    this.status = status;
  }
}

export default UseCaseError;
