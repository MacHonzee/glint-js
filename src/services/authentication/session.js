/**
 * @typedef {object} User
 * @property {string} username E-mail address of a user
 * @property {string} firstName
 * @property {string} lastName
 */

class Session {
  /**
   * Creates an instance of session.
   *
   * @param {object} opts
   * @param {string} opts.id
   * @param {User} opts.user
   * @param {number} opts.tokenIat
   * @param {number} opts.tokenExp
   */
  constructor(opts) {
    this.authenticated = true;
    this.id = opts.id;
    this.ts = new Date();
    this.user = opts.user;
    this.tokenIat = opts.tokenIat;
    this.tokenExp = opts.tokenExp;
  }
}

export default Session;
