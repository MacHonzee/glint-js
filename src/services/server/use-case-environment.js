import {URL} from 'url';

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

    this._dtoIn = {...this._req.query, ...this._req.body};

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
}

export default UseCaseEnvironment;
