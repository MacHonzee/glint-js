/**
 * User information stored in a session
 */
export interface User {
  /** Email address of the user (username) */
  username: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User's unique identifier */
  id?: string;
  /** Additional user properties */
  [key: string]: any;
}

/**
 * Options for creating a session
 */
interface SessionOptions {
  /** Session identifier */
  id: string;
  /** User information (can be a User object or just a username string for simple tokens like reset tokens) */
  user: User | string;
  /** Token issued at timestamp (Unix epoch) */
  tokenIat: number;
  /** Token expiration timestamp (Unix epoch) */
  tokenExp: number;
}

/**
 * Represents an authenticated user session.
 * Contains user information and token metadata.
 *
 * Sessions are created when a user successfully authenticates (login)
 * and are validated on subsequent requests via JWT tokens.
 *
 * @example
 * const session = new Session({
 *   id: "user123",
 *   user: { username: "user@example.com", firstName: "John", lastName: "Doe" },
 *   tokenIat: 1234567890,
 *   tokenExp: 1234568790
 * });
 *
 * console.log(session.authenticated); // true
 * console.log(session.user.username); // "user@example.com"
 */
class Session {
  /** Indicates if the session represents an authenticated user (always true) */
  authenticated: boolean = true;

  /** Session/user identifier */
  id: string;

  /** Session creation timestamp */
  ts: Date;

  /** User information (can be a User object or just a username string for simple tokens like reset tokens) */
  user: User | string;

  /** Token issued at timestamp (Unix epoch seconds) */
  tokenIat: number;

  /** Token expiration timestamp (Unix epoch seconds) */
  tokenExp: number;

  /**
   * Creates an instance of Session.
   * @param opts - Session configuration options
   */
  constructor(opts: SessionOptions) {
    this.authenticated = true;
    this.id = opts.id;
    this.ts = new Date();
    this.user = opts.user;
    this.tokenIat = opts.tokenIat;
    this.tokenExp = opts.tokenExp;
  }
}

export default Session;
