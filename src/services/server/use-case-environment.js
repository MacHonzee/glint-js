import { URL, parse as parseUrl } from "url";
import qs from "qs";

class Uri extends URL {
  constructor(input, base) {
    super(input, base);
    this.useCase = this.pathname;
  }
}

class UseCaseEnvironment {
  constructor(req, res) {
    this._req = req;
    this._res = res;

    const parsedQuery = qs.parse(parseUrl(this._req.url).query);
    this._dtoIn = { ...parsedQuery, ...this._req.body, ...this._req.files };

    this._uri = new Uri(`${req.protocol}://${req.host}${req.originalUrl}`);
  }

  get dtoIn() {
    return this._dtoIn;
  }

  set mapping(mapping) {
    this._mapping = mapping;
  }

  get mapping() {
    return this._mapping;
  }

  set session(session) {
    this._session = session;
  }

  get session() {
    return this._session;
  }

  get uri() {
    return this._uri;
  }

  set authorizationResult(authorizationResult) {
    this._authzResult = authorizationResult;
  }

  get authorizationResult() {
    return this._authzResult;
  }

  get request() {
    return this._req;
  }

  get response() {
    return this._res;
  }
}

export default UseCaseEnvironment;
