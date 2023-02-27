class UseCaseError extends Error {
  constructor(message, code, params, status = 400) {
    super();
    this.message = message;
    this.code = "glint-js/" + code;
    this.params = params;
    this.status = status;
  }
}

export default UseCaseError;
