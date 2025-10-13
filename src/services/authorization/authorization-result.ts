/**
 * Options for creating an authorization result
 */
interface AuthorizationResultOptions {
  /** Whether the user is authorized for the use case */
  authorized: boolean;
  /** User's email address */
  username: string;
  /** The use case being authorized */
  useCase: string;
  /** List of roles that are valid for the use case */
  useCaseRoles?: string[];
  /** List of roles that the user currently possesses */
  userRoles?: string[];
}

/**
 * Represents the result of an authorization check.
 * Contains information about whether a user is authorized to access a use case,
 * along with details about the user's roles and the use case requirements.
 *
 * @example
 * const result = new AuthorizationResult({
 *   authorized: true,
 *   username: "user@example.com",
 *   useCase: "/user/profile",
 *   useCaseRoles: ["authenticated"],
 *   userRoles: ["authenticated", "premium"]
 * });
 *
 * if (result.authorized) {
 *   console.log(`${result.username} can access ${result.useCase}`);
 * }
 */
class AuthorizationResult {
  /** Whether the user is authorized for the use case */
  authorized: boolean;

  /** User's email address */
  username: string;

  /** List of roles that are valid for the use case */
  useCaseRoles: string[];

  /** List of roles that the user currently possesses */
  userRoles: string[];

  /** The use case being authorized */
  useCase: string;

  /**
   * Creates an instance of AuthorizationResult.
   * Represents the state of a user's authorization against a given use case.
   *
   * @param options - Authorization result configuration
   */
  constructor({ authorized, username, useCaseRoles = [], userRoles = [], useCase }: AuthorizationResultOptions) {
    this.authorized = authorized;
    this.username = username;
    this.useCaseRoles = useCaseRoles;
    this.userRoles = userRoles;
    this.useCase = useCase;
  }
}

export default AuthorizationResult;
