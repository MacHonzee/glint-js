/**
 * @typedef {object} User
 * @property {string} id Database id of a user
 * @property {string} username E-mail address of a user
 * @property {string} firstName
 * @property {string} lastName
 */

/**
 * Represents the authenticated session of a user, created when a JWT is
 * successfully verified. Carried through the request lifecycle via `req.ucEnv.session`.
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
