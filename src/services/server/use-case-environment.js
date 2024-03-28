import { parse as parseUrl } from "url";
import qs from "qs";
import Uri from "./uri.js";

class UseCaseEnvironment {
  /**
   * @param {e.Request} req
   * @param {e.Response} res
   */
  constructor(req, res) {
    this._req = req;
    this._res = res;

    const parsedQuery = qs.parse(parseUrl(this._req.url).query);
    this._dtoIn = { ...parsedQuery, ...this._req.body, ...this._req.files };

    this._uri = new Uri(`${req.protocol}://${req.get("host")}${req.originalUrl}`);
  }

  /**
   * @returns {object} Object merged from query, body and files from request
   */
  get dtoIn() {
    return this._dtoIn;
  }

  /**
   * @param {RouteConfig} mapping
   */
  set mapping(mapping) {
    this._mapping = mapping;
  }

  /**
   * @returns {RouteConfig}
   */
  get mapping() {
    return this._mapping;
  }

  /**
   * @param {Session} session
   */
  set session(session) {
    this._session = session;
  }

  /**
   * @returns {Session}
   */
  get session() {
    return this._session;
  }

  /**
   * @returns {Uri}
   */
  get uri() {
    return this._uri;
  }

  /**
   * @param {AuthorizationResult} authorizationResult
   */
  set authorizationResult(authorizationResult) {
    this._authzResult = authorizationResult;
  }

  /**
   * @returns {AuthorizationResult}
   */
  get authorizationResult() {
    return this._authzResult;
  }

  /**
   * @returns {e.Request}
   */
  get request() {
    return this._req;
  }

  /**
   * @returns {e.Response}
   */
  get response() {
    return this._res;
  }
}

export default UseCaseEnvironment;
