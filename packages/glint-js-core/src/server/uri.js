import { URL } from "node:url";

/**
 * Uri class that extends the URL class.
 * @class Uri
 * @constructor {URL}
 */
class Uri extends URL {
  /**
   * Creates an instance of Uri.
   * @param {string} input The URL string.
   * @param {string} [base] The base URL if the input is not an absolute URL.
   * @memberof Uri
   */
  constructor(input, base) {
    super(input, base);
    // The useCase property is set to the pathname of the URL.
    this.useCase = this.pathname;
  }
}

export default Uri;
