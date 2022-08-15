import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import ms from 'ms';
import mongoose from 'mongoose';

const CFG_DEFAULTS = {
  sessionExpiry: '30m',
  refreshTokenExpiry: '30d',
};

class AuthenticationService {
  async init() {
    this._sessionExpiry = ms(process.env.AUTH_SESSION_EXPIRY || CFG_DEFAULTS.sessionExpiry) / 1000;
    this._refreshTokenExpiry = ms(process.env.AUTH_REFRESH_TOKEN_EXPIRY || CFG_DEFAULTS.refreshTokenExpiry) / 1000;

    // TODO read secrets from SecretStore for AUTH_JWT_SECRET and AUTH_REFRESH_TOKEN_SECRET
    this._cookieKey = process.env.AUTH_COOKIE_KEY;
    this._tokenKey = process.env.AUTH_JWT_KEY;
    this._refreshTokenKey = process.env.AUTH_REFRESH_TOKEN_KEY;
  }

  async initCookieParser(app) {
    this.COOKIE_OPTIONS = {
      httpOnly: true,
      // Since localhost is not having https protocol, secure cookies do not work correctly
      secure: process.env.NODE_ENV === 'production',
      signed: true,
      maxAge: this._refreshTokenExpiry,
      sameSite: 'none',
    };

    // TODO read secrets from SecretStore for COOKIE_SECRET
    app.use(cookieParser(this._cookieKey));
  }

  getToken(userPayload) {
    return jwt.sign({id: userPayload.id, user: userPayload}, this._tokenKey, {
      expiresIn: this._sessionExpiry,
    });
  };

  getRefreshToken(userPayload) {
    // create token id
    const refreshTokenId = new mongoose.Types.ObjectId();

    // create iat and exp for token, save it in unix epoch
    const refreshTokenTtl = new Date();
    const iat = Math.floor(refreshTokenTtl.getTime() / 1000);
    refreshTokenTtl.setSeconds(refreshTokenTtl.getSeconds() + this._refreshTokenExpiry);
    const exp = Math.floor(refreshTokenTtl.getTime() / 1000);

    // create the token with the data and secret
    const refreshToken = jwt.sign( {tid: refreshTokenId, user: userPayload, iat, exp}, this._refreshTokenKey);

    return {
      refreshToken,
      refreshTokenTtl,
      refreshTokenId,
    };
  };

  verifyToken(token) {
    // TODO implement a blacklist of tokens in memcached / redis / something, that will
    // make sure that logout / password change will invalidate the token
    return jwt.verify(token, this._tokenKey);
  }

  verifyRefreshToken(refreshToken) {
    return jwt.verify(refreshToken, this._refreshTokenKey);
  };

  decodeToken(token) {
    return jwt.decode(token);
  }

  async login(username, password) {
    const UserModel = await import('../../models/user-model.js');
    return await UserModel.default.authenticate()(username, password);
  }
}

export default new AuthenticationService();
