import UserModel from "../models/user-model.js";
import RefreshTokenModel from "../models/refresh-token-model.js";
import ValidationService from "../services/validation/validation-service.js";
import UseCaseError from "../services/server/use-case-error.js";
import LoggerFactory from "../services/logging/logger-factory.js";
import AuthenticationService from "../services/authentication/authentication-service.js";
import UserService from "../services/authentication/user-service.js";
import MailService from "../services/mail/mail-service.js";
import { randomBytes } from "crypto";
import type { Response } from "express";
import type UseCaseEnvironment from "../services/server/use-case-environment.js";

// Import typed DTOs from validation schemas (DRY solution!)
import type {
  UserRegisterDto,
  UserLoginDto,
  UserChangePasswordDto,
  UserResetPasswordDto,
  UserChangePasswordByResetDto,
  UserListDto,
  UserGetDto,
  UserSetPasswordDto,
} from "../validation-schemas/user-validation.js";

/**
 * Error thrown when password and confirmPassword don't match
 */
class MismatchingPasswords extends UseCaseError {
  constructor() {
    super("Password is not repeated properly and is not matching.", {}, 401);
  }
}

/**
 * Error thrown when user registration fails
 */
class RegistrationFailed extends UseCaseError {
  constructor(name: string, cause: string) {
    super("Registration has failed.", { name, cause });
  }
}

/**
 * Error thrown when login fails
 */
class LoginFailed extends UseCaseError {
  constructor(cause: string) {
    super("Login has failed.", { cause }, 401);
  }
}

/**
 * Error thrown when refresh token is invalid or missing
 */
class InvalidRefreshToken extends UseCaseError {
  constructor() {
    super("Invalid or missing refreshToken cookie.", {}, 401);
  }
}

/**
 * Error thrown when refresh token doesn't match stored token
 */
class RefreshTokenMismatch extends UseCaseError {
  constructor() {
    super("Refresh token has not been matched.", {}, 401);
  }
}

/**
 * Error thrown when CSRF token is missing
 */
class MissingCsrfToken extends UseCaseError {
  constructor() {
    super("Missing CSRF protection header.", {}, 401);
  }
}

/**
 * Error thrown when CSRF token is invalid
 */
class InvalidCsrfToken extends UseCaseError {
  constructor() {
    super("Invalid CSRF token.", {}, 401);
  }
}

/**
 * Error thrown when user is not found
 */
class UserNotFound extends UseCaseError {
  constructor(username: string) {
    super("User not found.", { username }, 404);
  }
}

/**
 * User route for authentication and user management.
 * Handles registration, login, logout, password changes, and user listing.
 */
class UserRoute {
  logger = LoggerFactory.create("Route.UserRoute");

  ERRORS = {
    MismatchingPasswords,
    RegistrationFailed,
    LoginFailed,
    RefreshTokenMismatch,
    InvalidRefreshToken,
    MissingCsrfToken,
    InvalidCsrfToken,
    UserNotFound,
  };

  /**
   * Email template for password reset
   */
  RESET_PASS_MAIL = {
    subject: "Obnova hesla do aplikace Energetická bilance",
    html: ({ resetToken, hostUri }: { resetToken: string; hostUri: string }) => `<div>
    Dobrý den,
    <br/><br/>
    Obdrželi jsme žádost o obnovu hesla do aplikace Energetická bilance. Pokud jste obnovu hesla nevyžádali, můžete tento e-mail ignorovat.
    <br/><br/>
    Klikněte na odkaz níže pro nastavení nového hesla. Odkaz je platný pouze 24 hodin.<br/>
    <ul><li><b>
        <a href="${hostUri}/resetPassword?token=${resetToken}">OBNOVA HESLA</a>
    </b></li></ul>
    <br/><br/>
    Na tento e-mail neodpovídejte, byl automaticky generován systémem.
    <br/><br/>
    S pozdravem,<br/>
    tým Energetická bilance
</div>`,
  };

  /**
   * Registers a new user.
   * Validates password match, creates user, and issues tokens.
   *
   * @param ucEnv - Use case environment with UserRegisterDto
   * @returns User and JWT token
   */
  async register({ dtoIn, uri, response }: UseCaseEnvironment<UserRegisterDto>): Promise<any> {
    await ValidationService.validate(dtoIn, uri.useCase);

    // check matching password
    if (dtoIn.password !== dtoIn.confirmPassword) {
      throw new this.ERRORS.MismatchingPasswords();
    }

    // create model for user
    const normalizedUsername = this._normalizeUsername(dtoIn.username);
    const newUser = new (UserModel as any)({
      username: normalizedUsername,
      firstName: dtoIn.firstName,
      lastName: dtoIn.lastName,
      language: dtoIn.language,
      email: dtoIn.email || normalizedUsername,
    });

    // save user to database to check constraints
    let registeredUser;
    try {
      registeredUser = await UserModel.register(newUser, dtoIn.password);
    } catch (e: any) {
      this.logger.error(e);
      throw new this.ERRORS.RegistrationFailed(e.name, e.message);
    }

    const token = await this._handleUserAndTokens(registeredUser, response);

    return {
      token,
      user: registeredUser,
    };
  }

  /**
   * Logs in a user.
   * Authenticates with username and password, issues tokens.
   *
   * @param ucEnv - Use case environment with UserLoginDto
   * @returns User and JWT token
   */
  async login({ dtoIn, uri, response }: UseCaseEnvironment<UserLoginDto>): Promise<any> {
    await ValidationService.validate(dtoIn, uri.useCase);

    // authenticate based on username and password
    const normalizedUsername = this._normalizeUsername(dtoIn.username);
    const { user, error } = await AuthenticationService.login(normalizedUsername, dtoIn.password);

    // check if authentication was successful and translate it to Http error
    if (error) {
      throw new this.ERRORS.LoginFailed(error);
    }

    const token = await this._handleUserAndTokens(user, response);

    return {
      user,
      token,
    };
  }

  /**
   * Refreshes authentication token using refresh token cookie.
   * Validates CSRF token for protection against CSRF attacks.
   *
   * @param ucEnv - Use case environment
   * @returns User and new JWT token
   */
  async refreshToken({ request, response }: UseCaseEnvironment): Promise<any> {
    // Check refreshToken cookie exists first
    const refreshToken = request.signedCookies?.refreshToken;
    if (!refreshToken) throw new this.ERRORS.InvalidRefreshToken();

    // CSRF protection: require header and verify against DB-stored token
    const csrfHeader = request.headers["x-xsrf-token"] || request.headers["x-csrf-token"];
    if (!csrfHeader) throw new this.ERRORS.MissingCsrfToken();

    // verify that token has been signed with correct secret
    const jwtData = AuthenticationService.verifyRefreshToken(refreshToken);

    // find refreshToken based on the signed token id
    const tokenId = jwtData.tid;
    if (!tokenId) {
      throw new this.ERRORS.RefreshTokenMismatch();
    }
    const refreshTokenModel = await RefreshTokenModel.findByToken(tokenId.toString());

    // verify that the token is saved to given refreshToken (could be changed or deleted because of logout)
    if (!refreshTokenModel || refreshTokenModel.token !== refreshToken) {
      throw new this.ERRORS.RefreshTokenMismatch();
    }

    // compare CSRF header to stored token
    if (!refreshTokenModel.csrfToken || refreshTokenModel.csrfToken !== (csrfHeader as string)) {
      throw new this.ERRORS.InvalidCsrfToken();
    }

    const token = await this._handleUserAndTokens(refreshTokenModel.user, response, refreshTokenModel);

    return {
      user: refreshTokenModel.user,
      token,
    };
  }

  /**
   * Logs out a user.
   * Deletes refresh token from database and clears cookie.
   * Supports global logout (all devices) or single device logout.
   *
   * @param ucEnv - Use case environment with UserLogoutDto
   * @returns Empty object
   */
  async logout({ request, response, dtoIn }: UseCaseEnvironment): Promise<any> {
    const refreshToken = request.signedCookies?.refreshToken;
    if (!refreshToken) throw new this.ERRORS.InvalidRefreshToken();

    // TODO changePassword and logout have some common logic
    // delete refresh token from database
    const decodedToken = AuthenticationService.decodeToken(refreshToken);
    if (dtoIn.global) {
      await RefreshTokenModel.deleteByUsername(decodedToken.user.username);
    } else {
      await RefreshTokenModel.deleteByToken(decodedToken.tid);
    }

    // and clear cookie of client
    response.clearCookie("refreshToken");

    // TODO add the session token to blacklist - based on dtoIn.global

    return {};
  }

  /**
   * Changes password for authenticated user.
   * Requires current password verification.
   * Performs global logout (all devices) and issues new tokens.
   *
   * @param ucEnv - Use case environment with UserChangePasswordDto
   * @returns User and new JWT token
   */
  async changePassword({ uri, dtoIn, session, response }: UseCaseEnvironment<UserChangePasswordDto>): Promise<any> {
    await ValidationService.validate(dtoIn, uri.useCase);

    // check matching password
    if (dtoIn.password !== dtoIn.confirmPassword) {
      throw new this.ERRORS.MismatchingPasswords();
    }

    // Get username from session (handle both User object and string)
    const sessionUsername = typeof session!.user === "string" ? session!.user : session!.user.username;

    // change the password
    const user = await UserService.findByUsername(sessionUsername);
    await user.changePassword(dtoIn.currentPassword, dtoIn.password);

    // perform global logout by deleting all refresh tokens
    // TODO "blacklist" the username and whitelist the new JWT token
    await RefreshTokenModel.deleteByUsername(sessionUsername);

    // and create new token
    const token = await this._handleUserAndTokens(user, response);

    return {
      user,
      token,
    };
  }

  /**
   * Initiates password reset flow.
   * Generates reset token, saves to database, and sends reset email.
   *
   * @param ucEnv - Use case environment with UserResetPasswordDto
   * @returns Status OK
   */
  async resetPassword({ uri, dtoIn }: UseCaseEnvironment<UserResetPasswordDto>): Promise<any> {
    await ValidationService.validate(dtoIn, uri.useCase);

    // generate the reset token
    const normalizedUsername = this._normalizeUsername(dtoIn.username);
    const resetToken = this._createResetToken(normalizedUsername);

    // save the reset token to DB
    const user = await UserService.findByUsername(normalizedUsername);
    user.resetToken = resetToken;
    await user.save();

    // perform "global logout" by deleting all refresh tokens
    await RefreshTokenModel.deleteByUsername(normalizedUsername);

    // send email that contains some information about the new password
    await MailService.send({
      to: dtoIn.username,
      subject: this.RESET_PASS_MAIL.subject,
      html: this.RESET_PASS_MAIL.html({ resetToken, hostUri: dtoIn.hostUri }),
    });

    return { status: "OK" };
  }

  /**
   * Changes password using reset token from email.
   * Verifies reset token, sets new password, clears reset token.
   *
   * @param ucEnv - Use case environment with UserChangePasswordByResetDto
   * @returns Status OK
   */
  async changePasswordByReset({ uri, dtoIn }: UseCaseEnvironment<UserChangePasswordByResetDto>): Promise<any> {
    await ValidationService.validate(dtoIn, uri.useCase);

    // check matching password
    if (dtoIn.password !== dtoIn.confirmPassword) {
      throw new this.ERRORS.MismatchingPasswords();
    }

    // verify token
    const resetSession = await AuthenticationService.verifyToken(dtoIn.token);

    // set new password
    // resetSession.user can be either a User object or a string (for reset tokens)
    const username = typeof resetSession.user === "string" ? resetSession.user : resetSession.user.username;
    const user = await UserService.findByUsername(username);
    await user.setPassword(dtoIn.password);
    user.resetToken = undefined;
    await user.save();

    return { status: "OK" };
  }

  /**
   * Lists all users.
   * Can optionally include user permissions.
   *
   * @param ucEnv - Use case environment with UserListDto
   * @returns List of users
   */
  async list({ uri, dtoIn }: UseCaseEnvironment<UserListDto>): Promise<any> {
    await ValidationService.validate(dtoIn, uri.useCase);

    let users;
    if (dtoIn.withPermissions) {
      users = await UserModel.listWithPermissions();
    } else {
      users = await UserModel.list();
    }

    return {
      users,
    };
  }

  /**
   * Gets a single user by username.
   *
   * @param ucEnv - Use case environment with UserGetDto
   * @returns User data
   */
  async get({ uri, dtoIn }: UseCaseEnvironment<UserGetDto>): Promise<any> {
    await ValidationService.validate(dtoIn, uri.useCase);

    const user = await UserModel.safeFindByUsername(dtoIn.username);
    if (!user) {
      throw new UserNotFound(dtoIn.username);
    }

    return user;
  }

  /**
   * Sets password for a user (admin function).
   * Doesn't require current password verification.
   *
   * @param ucEnv - Use case environment with UserSetPasswordDto
   * @returns User and status OK
   */
  async setPassword({ uri, dtoIn }: UseCaseEnvironment<UserSetPasswordDto>): Promise<any> {
    await ValidationService.validate(dtoIn, uri.useCase);

    const user = await UserService.findByUsername(dtoIn.username);
    await user.setPassword(dtoIn.password);
    await user.save();

    return { user, status: "OK" };
  }

  /**
   * Handles common logic for creating tokens and setting refresh token cookie.
   * Creates JWT token, refresh token, CSRF token, and stores/updates in database.
   *
   * @param user - User object
   * @param response - Express response object
   * @param refreshTokenToUpdate - Optional existing refresh token to update
   * @returns JWT token string
   * @private
   */
  private async _handleUserAndTokens(user: any, response: Response, refreshTokenToUpdate?: any): Promise<string> {
    // make sure that we do not return hash and salt under any circumstance
    user.hash = undefined;
    user.salt = undefined;

    // create new refresh token
    // TODO optimize it, we probably dont need to create new token every ~5 minutes, but after some timeout
    const userPayload = {
      id: user._id || user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    const { refreshToken, refreshTokenId, refreshTokenTtl } = AuthenticationService.getRefreshToken(userPayload);
    const csrfToken = randomBytes(32).toString("hex");

    // and create or update the token in the database (in register and login we create, in refreshToken we update)
    const refreshTokenData = {
      token: refreshToken,
      tid: refreshTokenId,
      expiresAt: refreshTokenTtl,
      csrfToken,
      user: userPayload,
    };
    if (refreshTokenToUpdate) {
      await RefreshTokenModel.updateByToken(refreshTokenToUpdate.tid, refreshTokenData);
    } else {
      const refreshTokenModel = new (RefreshTokenModel as any)(refreshTokenData);
      await refreshTokenModel.save();
    }

    // then create new short-lived token and save the long-lived refreshToken to response
    const token = AuthenticationService.getToken(userPayload);
    response.cookie("refreshToken", refreshToken, AuthenticationService.COOKIE_OPTIONS);

    // set readable CSRF token header for frontend
    response.set("X-Csrf-Token", csrfToken);

    return token;
  }

  /**
   * Normalizes username to lowercase and trims whitespace.
   * @param username - Raw username
   * @returns Normalized username
   * @private
   */
  private _normalizeUsername(username: string): string {
    return username.toLowerCase().trim();
  }

  /**
   * Creates a reset token JWT for password reset flow.
   * @param username - Username to encode in token
   * @returns Reset token string
   * @private
   */
  private _createResetToken(username: string): string {
    return AuthenticationService.getToken(username, "24h");
  }
}

export default new UserRoute();
