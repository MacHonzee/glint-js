import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import ms from "ms";
import mongoose from "mongoose";

import Config from "../utils/config.js";
import UserModel from "../../models/user-model.js";
import SecretManager from "../secret-manager/secret-manager.js";
import Session from "./session.js";

const CFG_DEFAULTS = {
  sessionExpiry: "15m",
  refreshTokenExpiry: "30d",
};

/**
 * Singleton service responsible for JWT token issuance, verification, and
 * cookie-based refresh-token management. Secrets are loaded from environment
 * variables or Google Cloud Secret Manager on first initialization.
 */
class AuthenticationService {
  _initialized = false;

  /**
   * Method initializes all the required parameters, secrets and keys to make Authentication work
   *
   * @param {boolean} forceInit
   * @returns {Promise<void>}
   */
  async init(forceInit = false) {
    if (this._initialized && !forceInit) return;

    this._sessionExpiry = ms(Config.get("AUTH_SESSION_EXPIRY") || CFG_DEFAULTS.sessionExpiry) / 1000;
    this._refreshTokenExpiry = ms(Config.get("AUTH_REFRESH_TOKEN_EXPIRY") || CFG_DEFAULTS.refreshTokenExpiry) / 1000;

    this._cookieKey = Config.get("AUTH_COOKIE_KEY") || (await SecretManager.get("authCookieKey"));
    this._tokenKey = Config.get("AUTH_JWT_KEY") || (await SecretManager.get("authJwtKey"));
    this._refreshTokenKey = Config.get("AUTH_REFRESH_TOKEN_KEY") || (await SecretManager.get("authRefreshTokenKey"));

    const isProduction = Config.get("NODE_ENV") === "production";

    this.COOKIE_OPTIONS = {
      httpOnly: true,
      secure: isProduction,
      signed: true,
      maxAge: this._refreshTokenExpiry * 1000,

      // frontend is handled always from different service, hence "none" for prod
      sameSite: isProduction ? "none" : "lax",

      // we need it at least in logout and refreshToken commands
      path: "/user",
    };

    this._initialized = true;
  }

  /**
   * Registers `cookie-parser` middleware on the Express app using the stored cookie key.
   *
   * @param {import('express').Application} app
   * @returns {Promise<void>}
   */
  async initCookieParser(app) {
    app.use(cookieParser(this._cookieKey));
  }

  /**
   * Creates a short-lived JWT session token.
   *
   * @param {object|string} userPayload - User data or username to embed in the token.
   * @param {number} [sessionExpiry] - Override for token TTL in seconds.
   * @returns {string} Signed JWT.
   */
  getToken(userPayload, sessionExpiry) {
    return jwt.sign({ id: userPayload.id, user: userPayload }, this._tokenKey, {
      expiresIn: sessionExpiry || this._sessionExpiry,
    });
  }

  /**
   * Creates a long-lived refresh token with a unique ID and expiration.
   *
   * @param {object} userPayload - User data to embed.
   * @returns {{ refreshToken: string, refreshTokenTtl: Date, refreshTokenId: import('mongoose').Types.ObjectId }}
   */
  getRefreshToken(userPayload) {
    // create token id
    // TODO remove dependency on mongoose here and generate it via "crypto" or something
    const refreshTokenId = new mongoose.Types.ObjectId();

    // create iat and exp for token, save it in unix epoch
    const refreshTokenTtl = new Date();
    const iat = Math.floor(refreshTokenTtl.getTime() / 1000);
    refreshTokenTtl.setSeconds(refreshTokenTtl.getSeconds() + this._refreshTokenExpiry);
    const exp = Math.floor(refreshTokenTtl.getTime() / 1000);

    // create the token with the data and secret
    const refreshToken = jwt.sign({ tid: refreshTokenId, user: userPayload, iat, exp }, this._refreshTokenKey);

    return {
      refreshToken,
      refreshTokenTtl,
      refreshTokenId,
    };
  }

  /**
   * Method verifies if the token is valid and returns instance of Session if it is.
   *
   * @param {string} token
   * @returns {Session}
   */
  verifyToken(token) {
    // TODO implement a blacklist of tokens in memcached / redis / something, that will
    // make sure that logout / password change will invalidate the token

    const tokenPayload = jwt.verify(token, this._tokenKey);
    return new Session({
      id: tokenPayload.id,
      user: tokenPayload.user,
      tokenIat: tokenPayload.iat,
      tokenExp: tokenPayload.exp,
    });
  }

  /**
   * Verifies a refresh token's signature and returns its decoded payload.
   *
   * @param {string} refreshToken - Signed refresh JWT.
   * @returns {object} Decoded payload.
   * @throws {import('jsonwebtoken').JsonWebTokenError} If the token is invalid.
   */
  verifyRefreshToken(refreshToken) {
    return jwt.verify(refreshToken, this._refreshTokenKey);
  }

  /**
   * Decodes a JWT without verifying its signature.
   *
   * @param {string} token
   * @returns {object|null} Decoded payload, or `null` if malformed.
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Authenticates a user via `passport-local-mongoose`.
   *
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{user: object, error: *}>}
   */
  async login(username, password) {
    return await UserModel.authenticate()(username, password);
  }
}

export default new AuthenticationService();
