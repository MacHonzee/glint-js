import passport from 'passport';
import jwt from 'jsonwebtoken';
import LocalStrategy from './local-strategy.js';
import JwtStrategy from './jwt-strategy.js';
import cookieParser from 'cookie-parser';

// TODO this needs some refactoring
class AuthenticationService {
  async init() {
    // TODO read secrets from SecretStore for JWT_SECRET and REFRESH_TOKEN_SECRET
    await LocalStrategy.init();
    await JwtStrategy.init();
  }

  async initCookieParser(app) {
    this.COOKIE_OPTIONS = {
      httpOnly: true,
      // Since localhost is not having https protocol,
      // secure cookies do not work correctly
      secure: process.env.NODE_ENV === 'production',
      signed: true,
      maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRY),
      sameSite: 'none',
    };

    // TODO read secrets from SecretStore for COOKIE_SECRET
    app.use(cookieParser(process.env.COOKIE_SECRET));
  }

  getToken(userId) {
    return jwt.sign(userId, process.env.JWT_SECRET, {
      expiresIn: parseInt(process.env.SESSION_EXPIRY),
    });
  };

  getRefreshToken(userId) {
    return jwt.sign(userId, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: parseInt(process.env.REFRESH_TOKEN_EXPIRY),
    });
  };

  verifyRefreshToken(refreshToken) {
    return jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  };

  verifyUser() {
    return passport.authenticate('jwt', {session: false});
  }

  async login(username, password) {
    const UserModel = await import('../../models/user-model.js');
    return await UserModel.default.authenticate()(username, password);
  }
}

export default new AuthenticationService();
