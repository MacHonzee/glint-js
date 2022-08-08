import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

class AuthenticationService {
  async init() {
    // TODO read secrets from SecretStore for JWT_SECRET and REFRESH_TOKEN_SECRET
  }

  async initCookieParser(app) {
    this.COOKIE_OPTIONS = {
      httpOnly: true,
      // Since localhost is not having https protocol, secure cookies do not work correctly
      secure: process.env.NODE_ENV === 'production',
      signed: true,
      maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRY),
      sameSite: 'none',
    };

    // TODO read secrets from SecretStore for COOKIE_SECRET
    app.use(cookieParser(process.env.COOKIE_SECRET));
  }

  getToken(userPayload) {
    return jwt.sign({id: userPayload.id, user: userPayload}, process.env.JWT_SECRET, {
      expiresIn: parseInt(process.env.SESSION_EXPIRY),
    });
  };

  getRefreshToken(userPayload) {
    return jwt.sign({id: userPayload.id, user: userPayload}, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: parseInt(process.env.REFRESH_TOKEN_EXPIRY),
    });
  };

  verifyToken(token) {
    // TODO implement a blacklist of tokens in memcached / redis / something, that will
    // make sure that logout / password change will invalidate the token
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  verifyRefreshToken(refreshToken) {
    return jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  };

  async login(username, password) {
    const UserModel = await import('../../models/user-model.js');
    return await UserModel.default.authenticate()(username, password);
  }
}

export default new AuthenticationService();
