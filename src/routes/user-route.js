import UserModel from "../models/user-model.js";
import RefreshTokenModel from "../models/refresh-token-model.js";
import ValidationService from "../services/validation/validation-service.js";
import UseCaseError from "../services/server/use-case-error.js";
import LoggerFactory from "../services/logging/logger-factory.js";
import AuthenticationService from "../services/authentication/authentication-service.js";
import UserService from "../services/authentication/user-service.js";
import MailService from "../services/mail/mail-service.js";
import Config from "../services/utils/config.js";
import DefaultRoles from "../config/default-roles.js";
import { randomBytes } from "crypto";

class MismatchingPasswords extends UseCaseError {
  constructor() {
    super("Password is not repeated properly and is not matching.", {}, 401);
  }
}

class RegistrationFailed extends UseCaseError {
  constructor(name, cause) {
    super("Registration has failed.", { name, cause });
  }
}

class LoginFailed extends UseCaseError {
  constructor(cause) {
    super("Login has failed.", { cause }, 401);
  }
}

class InvalidRefreshToken extends UseCaseError {
  constructor() {
    super("Invalid or missing refreshToken cookie.", {}, 401);
  }
}

class RefreshTokenMismatch extends UseCaseError {
  constructor() {
    super("Refresh token has not been matched.", {}, 401);
  }
}

class MissingCsrfToken extends UseCaseError {
  constructor() {
    super("Missing CSRF protection header.", {}, 401);
  }
}

class InvalidCsrfToken extends UseCaseError {
  constructor() {
    super("Invalid CSRF token.", {}, 401);
  }
}

class UserNotFound extends UseCaseError {
  constructor(username) {
    super("User not found.", { username }, 404);
  }
}

class UserNotVerified extends UseCaseError {
  constructor() {
    super("User email has not been verified. Please check your inbox for the verification email.", {}, 403);
  }
}

class InvalidVerificationToken extends UseCaseError {
  constructor() {
    super("Verification token is invalid or has already been used.", {}, 400);
  }
}

class UnauthorizedMetadataUpdate extends UseCaseError {
  constructor() {
    super("You are not authorized to update metadata for this user.", {}, 403);
  }
}

const REGISTRATION_FLOWS = {
  BASIC: "basic",
  EMAIL: "email",
};

class UserRoute {
  logger = LoggerFactory.create("Route.UserRoute");

  REGISTRATION_FLOWS = REGISTRATION_FLOWS;

  ERRORS = {
    MismatchingPasswords,
    RegistrationFailed,
    LoginFailed,
    RefreshTokenMismatch,
    InvalidRefreshToken,
    MissingCsrfToken,
    InvalidCsrfToken,
    UserNotFound,
    UserNotVerified,
    InvalidVerificationToken,
    UnauthorizedMetadataUpdate,
  };

  async register({ dtoIn, uri, response }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    const registrationFlow = Config.REGISTRATION_FLOW;

    // check matching password
    if (dtoIn.password !== dtoIn.confirmPassword) {
      throw new this.ERRORS.MismatchingPasswords();
    }

    // create model for user
    const normalizedUsername = this._normalizeUsername(dtoIn.username);
    const newUser = new UserModel({
      username: normalizedUsername,
      firstName: dtoIn.firstName,
      lastName: dtoIn.lastName,
      language: dtoIn.language,
      email: dtoIn.email || normalizedUsername,
    });

    // email verification flow: mark user as unverified
    if (registrationFlow === REGISTRATION_FLOWS.EMAIL) {
      newUser.verified = false;
    }

    // save user to database to check constraints
    let registeredUser;
    try {
      registeredUser = await UserModel.register(newUser, dtoIn.password);
    } catch (e) {
      this.logger.error(e);
      throw new this.ERRORS.RegistrationFailed(e.name, e.message);
    }

    // email verification flow: send verification email, do not return tokens
    if (registrationFlow === REGISTRATION_FLOWS.EMAIL) {
      const verificationToken = this._createVerificationToken(normalizedUsername);
      registeredUser.verificationToken = verificationToken;
      await registeredUser.save();

      await MailService.getInstance().sendRegistrationVerificationMail({
        to: dtoIn.email || normalizedUsername,
        verificationToken,
        hostUri: dtoIn.hostUri,
      });

      return { status: "OK" };
    }

    // basic flow: issue tokens immediately
    const token = await this._handleUserAndTokens(registeredUser, response);

    return {
      token,
      user: registeredUser,
    };
  }

  async login({ dtoIn, uri, response }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // authenticate based on username and password
    const normalizedUsername = this._normalizeUsername(dtoIn.username);
    const { user, error } = await AuthenticationService.login(normalizedUsername, dtoIn.password);

    // check if authentication was successful and translate it to Http error
    if (error) {
      throw new this.ERRORS.LoginFailed(error);
    }

    // block unverified users (strict check so undefined/legacy users pass through)
    if (user.verified === false) {
      throw new this.ERRORS.UserNotVerified();
    }

    const token = await this._handleUserAndTokens(user, response);

    return {
      user,
      token,
    };
  }

  async refreshToken({ request, response }) {
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
    const refreshTokenModel = await RefreshTokenModel.findByToken(tokenId);

    // verify that the token is saved to given refreshToken (could be changed or deleted because of logout)
    if (!refreshTokenModel || refreshTokenModel.token !== refreshToken) {
      throw new this.ERRORS.RefreshTokenMismatch();
    }

    // compare CSRF header to stored token
    if (!refreshTokenModel.csrfToken || refreshTokenModel.csrfToken !== csrfHeader) {
      throw new this.ERRORS.InvalidCsrfToken();
    }

    const token = await this._handleUserAndTokens(refreshTokenModel.user, response, refreshTokenModel);

    return {
      user: refreshTokenModel.user,
      token,
    };
  }

  async logout({ request, response, dtoIn }) {
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

  async changePassword({ uri, dtoIn, session, response }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // check matching password
    if (dtoIn.password !== dtoIn.confirmPassword) {
      throw new this.ERRORS.MismatchingPasswords();
    }

    // change the password
    const user = await UserService.findByUsername(session.user.username);
    await user.changePassword(dtoIn.currentPassword, dtoIn.password);

    // perform global logout by deleting all refresh tokens
    // TODO "blacklist" the username and whitelist the new JWT token
    await RefreshTokenModel.deleteByUsername(session.user.username);

    // and create new token
    const token = await this._handleUserAndTokens(user, response);

    return {
      user,
      token,
    };
  }

  async resetPassword({ uri, dtoIn }) {
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

    // send reset password email via the registered mail provider
    await MailService.getInstance().sendResetPasswordMail({
      to: dtoIn.username,
      resetToken,
      hostUri: dtoIn.hostUri,
    });

    return { status: "OK" };
  }

  async changePasswordByReset({ uri, dtoIn }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // check matching password
    if (dtoIn.password !== dtoIn.confirmPassword) {
      throw new this.ERRORS.MismatchingPasswords();
    }

    // verify token
    const resetSession = await AuthenticationService.verifyToken(dtoIn.token);

    // set new password
    const user = await UserService.findByUsername(resetSession.user);
    await user.setPassword(dtoIn.password);
    user.resetToken = undefined;
    await user.save();

    return { status: "OK" };
  }

  async verifyRegistration({ uri, dtoIn }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // verify the JWT token
    const session = await AuthenticationService.verifyToken(dtoIn.token);

    // find user and check that the verification token matches
    const user = await UserService.findByUsername(session.user);
    if (!user.verificationToken || user.verificationToken !== dtoIn.token) {
      throw new this.ERRORS.InvalidVerificationToken();
    }

    // mark user as verified and clear the token
    user.verified = true;
    user.verificationToken = undefined;
    await user.save();

    return { status: "OK" };
  }

  async list({ uri, dtoIn }) {
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

  async get({ uri, dtoIn }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    const user = await UserModel.safeFindByUsername(dtoIn.username);
    if (!user) {
      throw new UserNotFound(dtoIn.username);
    }

    return user;
  }

  async setPassword({ uri, dtoIn }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    const user = await UserService.findByUsername(dtoIn.username);
    await user.setPassword(dtoIn.password);
    await user.save();

    return { user, status: "OK" };
  }

  async updateMetadata({ uri, dtoIn, session, authorizationResult }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // Check authorization: userId must match session.user.id OR user must have Admin/Authority roles
    const isOwnUser = dtoIn.userId === session.user.id;
    const userRoles = authorizationResult.userRoles;
    const hasPrivilegedRole = userRoles.includes(DefaultRoles.admin) || userRoles.includes(DefaultRoles.authority);

    if (!isOwnUser && !hasPrivilegedRole) {
      throw new this.ERRORS.UnauthorizedMetadataUpdate();
    }

    // Find user by ID
    const user = await UserService.findById(dtoIn.userId);

    // Update metadata (replace entire metadata object)
    user.metadata = dtoIn.metadata || {};
    await user.save();

    // Return updated user (metadata is included, sensitive fields excluded via toJSON transform)
    return user;
  }

  // method handles common logic for creating new token, creating new refresh token
  // and updating or adding the refreshToken to user
  async _handleUserAndTokens(user, response, refreshTokenToUpdate) {
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
      const refreshTokenModel = new RefreshTokenModel(refreshTokenData);
      await refreshTokenModel.save();
    }

    // then create new short-lived token and save the long-lived refreshToken to response
    const token = AuthenticationService.getToken(userPayload);
    response.cookie("refreshToken", refreshToken, AuthenticationService.COOKIE_OPTIONS);

    // set readable CSRF token header for frontend
    response.set("X-Csrf-Token", csrfToken);

    return token;
  }

  _normalizeUsername(username) {
    return username.toLowerCase().trim();
  }

  _createResetToken(username) {
    return AuthenticationService.getToken(username, "24h");
  }

  _createVerificationToken(username) {
    return AuthenticationService.getToken(username, "24h");
  }
}

export default new UserRoute();
