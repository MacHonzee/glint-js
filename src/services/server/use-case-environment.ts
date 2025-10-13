import { parse as parseUrl } from "url";
import qs from "qs";
import Uri from "./uri.js";
import type { Request, Response } from "express";
import type { RouteMapping } from "../../config/mappings.js";
import type Session from "../authentication/session.js";
import type AuthorizationResult from "../authorization/authorization-result.js";

/**
 * Use case environment that encapsulates request context and dependencies.
 * This class provides a unified interface to access request data, session information,
 * authorization results, and other contextual information needed by route handlers.
 *
 * The dtoIn (Data Transfer Object Input) is automatically constructed by merging:
 * - Query parameters
 * - Request body
 * - Uploaded files
 *
 * @template TDtoIn - The type of the dtoIn object (defaults to any for backward compatibility)
 *
 * @example
 * // In a route handler:
 * async function login(ucEnv: UseCaseEnvironment<UserLoginDto>) {
 *   const { email, password } = ucEnv.dtoIn; // Fully typed!
 *   const user = ucEnv.session?.user;
 *   // ... business logic
 * }
 */
class UseCaseEnvironment<TDtoIn = any> {
  private _req: Request;
  private _res: Response;
  private _dtoIn: TDtoIn;
  private _uri: Uri;
  private _mapping?: RouteMapping;
  private _session?: Session;
  private _authzResult?: AuthorizationResult;

  /**
   * Creates a new use case environment from Express request and response objects.
   * @param req - Express request object
   * @param res - Express response object
   */
  constructor(req: Request, res: Response) {
    this._req = req;
    this._res = res;

    // Parse and merge all input sources into dtoIn
    const parsedQuery = qs.parse(parseUrl(this._req.url)?.query || "");
    this._dtoIn = { ...parsedQuery, ...this._req.body, ...this._req.files } as TDtoIn;

    // Construct full URI from request
    this._uri = new Uri(`${req.protocol}://${req.get("host")}${req.originalUrl}`);
  }

  /**
   * Gets the merged input data from query parameters, body, and files.
   * This is the primary way to access request data in route handlers.
   */
  get dtoIn(): TDtoIn {
    return this._dtoIn;
  }

  /**
   * Sets the route mapping configuration for this request.
   */
  set mapping(mapping: RouteMapping) {
    this._mapping = mapping;
  }

  /**
   * Gets the route mapping configuration for this request.
   */
  get mapping(): RouteMapping | undefined {
    return this._mapping;
  }

  /**
   * Sets the authenticated session for this request.
   */
  set session(session: Session) {
    this._session = session;
  }

  /**
   * Gets the authenticated session for this request.
   * Will be undefined if the user is not authenticated.
   */
  get session(): Session | undefined {
    return this._session;
  }

  /**
   * Gets the parsed URI object with useCase property.
   */
  get uri(): Uri {
    return this._uri;
  }

  /**
   * Sets the authorization result for this request.
   */
  set authorizationResult(authorizationResult: AuthorizationResult) {
    this._authzResult = authorizationResult;
  }

  /**
   * Gets the authorization result for this request.
   * Contains information about granted permissions and authorization status.
   */
  get authorizationResult(): AuthorizationResult | undefined {
    return this._authzResult;
  }

  /**
   * Gets the original Express request object.
   * Use this when you need direct access to Express request properties.
   */
  get request(): Request {
    return this._req;
  }

  /**
   * Gets the original Express response object.
   * Use this when you need direct access to Express response properties.
   */
  get response(): Response {
    return this._res;
  }
}

export default UseCaseEnvironment;
