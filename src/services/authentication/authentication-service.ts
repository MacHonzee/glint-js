import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import ms from "ms";
import mongoose from "mongoose";
import type { Express, CookieOptions } from "express";

import Config from "../utils/config.js";
import UserModel from "../../models/user-model.js";
import SecretManager from "../secret-manager/secret-manager.js";
import Session from "./session.js";
import type { User } from "./session.js";

/**
 * Default configuration values for authentication
 */
const CFG_DEFAULTS = {
  sessionExpiry: "15m",
  refreshTokenExpiry: "30d",
};

/**
 * JWT token payload interface
 */
interface TokenPayload {
  id: string;
  user: User;
  iat: number;
  exp: number;
}

/**
 * Refresh token payload interface
 */
interface RefreshTokenPayload {
  tid: mongoose.Types.ObjectId;
  user: User;
  iat: number;
  exp: number;
}

/**
 * Refresh token generation result
 */
interface RefreshTokenResult {
  refreshToken: string;
  refreshTokenTtl: Date;
  refreshTokenId: mongoose.Types.ObjectId;
}

/**
 * Authentication result from login
 */
interface AuthenticationResult {
  user: any;
  error?: any;
}

/**
 * Authentication service for JWT-based user authentication.
 * Handles session tokens, refresh tokens, and cookie management.
 *
 * Features:
 * - JWT session tokens (short-lived, default 15m)
 * - JWT refresh tokens (long-lived, default 30d)
 * - Signed HTTP-only cookies for refresh tokens
 * - Secret management via Google Cloud Secret Manager
 * - Production/development cookie policies
 *
 * Token types:
 * - Session token: Short-lived JWT for API authentication (sent in Authorization header)
 * - Refresh token: Long-lived JWT for obtaining new session tokens (stored in HTTP-only cookie)
 *
 * Configuration:
 * - AUTH_SESSION_EXPIRY: Session token lifetime (default: "15m")
 * - AUTH_REFRESH_TOKEN_EXPIRY: Refresh token lifetime (default: "30d")
 * - AUTH_COOKIE_KEY: Cookie signing secret (from env or Secret Manager: authCookieKey)
 * - AUTH_JWT_KEY: JWT signing secret (from env or Secret Manager: authJwtKey)
 * - AUTH_REFRESH_TOKEN_KEY: Refresh JWT secret (from env or Secret Manager: authRefreshTokenKey)
 *
 * @example
 * // Initialize on server startup
 * await AuthenticationService.init();
 *
 * // Generate session token
 * const token = AuthenticationService.getToken({ id: "123", username: "user@example.com" });
 *
 * // Verify session token
 * const session = AuthenticationService.verifyToken(token);
 * console.log(session.user.username);
 */
class AuthenticationService {
  private _initialized: boolean = false;
  private _sessionExpiry!: number;
  private _refreshTokenExpiry!: number;
  private _cookieKey?: string;
  private _tokenKey?: string;
  private _refreshTokenKey?: string;

  /** Cookie options for refresh tokens */
  COOKIE_OPTIONS!: CookieOptions;

  /**
   * Initializes the authentication service by loading secrets and configuration.
   * Must be called before using any other methods.
   *
   * @param forceInit - Force re-initialization even if already initialized
   *
   * @example
   * await AuthenticationService.init();
   */
  async init(forceInit: boolean = false): Promise<void> {
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

      // Frontend is handled always from different service, hence "none" for prod
      sameSite: isProduction ? "none" : "lax",

      // We need it at least in logout and refreshToken commands
      path: "/user",
    };

    this._initialized = true;
  }

  /**
   * Initializes the cookie parser middleware on the Express app.
   * @param app - Express application instance
   */
  async initCookieParser(app: Express): Promise<void> {
    app.use(cookieParser(this._cookieKey));
  }

  /**
   * Generates a session JWT token for a user.
   *
   * @param userPayload - User data to encode in the token, or a plain string for simple tokens (e.g., reset tokens)
   * @param sessionExpiry - Optional custom expiry time in seconds or string like "24h"
   * @returns Signed JWT token
   *
   * @example
   * const token = AuthenticationService.getToken({
   *   id: "123",
   *   username: "user@example.com",
   *   firstName: "John",
   *   lastName: "Doe"
   * });
   *
   * // Or for simple reset tokens:
   * const resetToken = AuthenticationService.getToken("user@example.com", "24h");
   */
  getToken(userPayload: (User & { id: string }) | string, sessionExpiry?: number | string): string {
    if (!this._tokenKey) {
      throw new Error("AuthenticationService not initialized. Call init() first.");
    }

    // If userPayload is a string, create a simple token with just the user field
    const payload = typeof userPayload === "string" ? { user: userPayload } : { id: userPayload.id, user: userPayload };

    return jwt.sign(payload, this._tokenKey, {
      expiresIn: sessionExpiry || this._sessionExpiry,
    });
  }

  /**
   * Generates a refresh token for a user.
   * Refresh tokens are used to obtain new session tokens without re-authentication.
   *
   * @param userPayload - User data to encode in the token
   * @returns Object containing the refresh token, its TTL, and token ID
   *
   * @example
   * const { refreshToken, refreshTokenTtl, refreshTokenId } =
   *   AuthenticationService.getRefreshToken({ id: "123", username: "user@example.com" });
   */
  getRefreshToken(userPayload: User): RefreshTokenResult {
    if (!this._refreshTokenKey) {
      throw new Error("AuthenticationService not initialized. Call init() first.");
    }

    // Create token ID
    // TODO: Remove dependency on mongoose here and generate it via "crypto" or something
    const refreshTokenId = new mongoose.Types.ObjectId();

    // Create iat and exp for token, save it in Unix epoch
    const refreshTokenTtl = new Date();
    const iat = Math.floor(refreshTokenTtl.getTime() / 1000);
    refreshTokenTtl.setSeconds(refreshTokenTtl.getSeconds() + this._refreshTokenExpiry);
    const exp = Math.floor(refreshTokenTtl.getTime() / 1000);

    // Create the token with the data and secret
    const refreshToken = jwt.sign({ tid: refreshTokenId, user: userPayload, iat, exp }, this._refreshTokenKey);

    return {
      refreshToken,
      refreshTokenTtl,
      refreshTokenId,
    };
  }

  /**
   * Verifies a session token and returns a Session instance if valid.
   *
   * @param token - The JWT token to verify
   * @returns Session instance with user data
   * @throws Error if token is invalid or expired
   *
   * @example
   * try {
   *   const session = AuthenticationService.verifyToken(token);
   *   console.log(session.user.username);
   * } catch (error) {
   *   console.error("Invalid token");
   * }
   */
  verifyToken(token: string): Session {
    if (!this._tokenKey) {
      throw new Error("AuthenticationService not initialized. Call init() first.");
    }

    // TODO: Implement a blacklist of tokens in memcached / redis / something, that will
    // make sure that logout / password change will invalidate the token

    const tokenPayload = jwt.verify(token, this._tokenKey) as TokenPayload;
    return new Session({
      id: tokenPayload.id,
      user: tokenPayload.user,
      tokenIat: tokenPayload.iat,
      tokenExp: tokenPayload.exp,
    });
  }

  /**
   * Verifies a refresh token and returns its payload.
   *
   * @param refreshToken - The refresh JWT token to verify
   * @returns Decoded refresh token payload
   * @throws Error if token is invalid or expired
   */
  verifyRefreshToken(refreshToken: string): RefreshTokenPayload {
    if (!this._refreshTokenKey) {
      throw new Error("AuthenticationService not initialized. Call init() first.");
    }

    return jwt.verify(refreshToken, this._refreshTokenKey) as RefreshTokenPayload;
  }

  /**
   * Decodes a JWT token without verifying its signature.
   * Useful for inspecting expired tokens.
   *
   * @param token - The JWT token to decode
   * @returns Decoded token payload or null if invalid format
   */
  decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Authenticates a user with username and password.
   * Uses passport-local-mongoose for authentication.
   *
   * @param username - User's email address
   * @param password - User's password
   * @returns Authentication result with user data or error
   *
   * @example
   * const result = await AuthenticationService.login("user@example.com", "password123");
   * if (result.user) {
   *   console.log("Login successful");
   * } else {
   *   console.log("Login failed:", result.error);
   * }
   */
  async login(username: string, password: string): Promise<AuthenticationResult> {
    return await UserModel.authenticate()(username, password);
  }
}

export default new AuthenticationService();
export type { TokenPayload, RefreshTokenPayload, RefreshTokenResult, AuthenticationResult };
