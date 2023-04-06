class UseCaseError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object?} params
   * @param {number} [status = 400]
   */
  constructor(message, code, params, status = 400) {
    super();
    this.message = message;
    this.code = "glint-js/" + code;
    this.params = params;
    this.status = status;
  }
}

export default UseCaseError;
