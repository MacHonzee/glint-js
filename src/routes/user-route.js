import UserModel from '../models/user-model.js';
import RefreshTokenModel from '../models/refresh-token-model.js';
import ValidationService from '../services/validation/validation-service.js';
import UseCaseError from '../services/server/use-case-error.js';
import LoggerFactory from '../services/logging/logger-factory.js';
import AuthenticationService from '../services/authentication/authentication-service.js';
import UserService from '../services/authentication/user-service.js';

class MismatchingPasswords extends UseCaseError {
  constructor() {
    super(
        'Password is not repeated properly and is not matching.',
        'mismatchingPasswords',
        {name, cause},
    );
  }
}

class RegistrationFailed extends UseCaseError {
  constructor(name, cause) {
    super(
        'Registration has failed.',
        'registrationFailed',
        {name, cause},
    );
  }
}

class LoginFailed extends UseCaseError {
  constructor(cause) {
    super(
        'Login has failed.',
        'loginFailed',
        {cause},
    );
  }
}

class InvalidRefreshToken extends UseCaseError {
  constructor() {
    super(
        'Invalid or missing refreshToken cookie.',
        'invalidRefreshToken',
    );
  }
}

class RefreshTokenMismatch extends UseCaseError {
  constructor() {
    super(
        'Refresh token has not been matched.',
        'refreshTokenMismatch',
    );
  }
}

class UserRoute {
  logger = LoggerFactory.create('Route.UserRoute');

  async register({dtoIn, uri, response}) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // check matching password
    if (dtoIn.password !== dtoIn.confirmPassword) {
      throw new MismatchingPasswords();
    }

    // create model for user
    const newUser = new UserModel({
      username: dtoIn.username,
      firstName: dtoIn.firstName,
      lastName: dtoIn.lastName,
      language: dtoIn.language,
      email: dtoIn.email || dtoIn.username,
    });

    // save user to database to check constraints
    let registeredUser;
    try {
      registeredUser = await UserModel.register(newUser, dtoIn.password);
    } catch (e) {
      this.logger.error(e);
      throw new RegistrationFailed(e.name, e.message);
    }

    const token = await this._handleUserAndTokens(registeredUser, response);

    return {
      token,
      user: registeredUser,
    };
  }

  async login({dtoIn, uri, response}) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // authenticate based on username and password
    const {user, error} = await AuthenticationService.login(dtoIn.username, dtoIn.password);

    // check if authentication was successful and translate it to Http error
    if (error) {
      throw new LoginFailed(error);
    }

    const token = await this._handleUserAndTokens(user, response);

    return {
      user,
      token,
    };
  }

  async refreshToken({request, response}) {
    const refreshToken = request.signedCookies?.refreshToken;
    if (!refreshToken) throw new InvalidRefreshToken();

    // verify that token has been signed with correct secret
    const jwtData = AuthenticationService.verifyRefreshToken(refreshToken);

    // find refreshToken based on the signed token id
    const tokenId = jwtData.tid;
    const refreshTokenModel = await RefreshTokenModel.findByToken(tokenId);

    // verify that the token is saved to given refreshToken (could be changed or deleted because of logout)
    if (!refreshTokenModel || refreshTokenModel.token !== refreshToken) {
      throw new RefreshTokenMismatch();
    }

    const token = await this._handleUserAndTokens(refreshTokenModel.user, response, refreshTokenModel);

    return {
      user: refreshTokenModel.user,
      token,
    };
  }

  async logout({request, response, dtoIn}) {
    const refreshToken = request.signedCookies?.refreshToken;
    if (!refreshToken) throw new InvalidRefreshToken();

    // TODO changePassword and logout have some common logic
    // delete refresh token from database
    const decodedToken = AuthenticationService.decodeToken(refreshToken);
    if (dtoIn.global) {
      await RefreshTokenModel.deleteByUsername(decodedToken.user.username);
    } else {
      await RefreshTokenModel.deleteByToken(decodedToken.tid);
    }

    // and clear cookie of client
    response.clearCookie('refreshToken');

    // TODO add the session token to blacklist - based on dtoIn.global

    return {};
  }

  async changePassword({uri, dtoIn, session, response}) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // check matching password
    if (dtoIn.password !== dtoIn.confirmPassword) {
      throw new MismatchingPasswords();
    }

    // change the password
    const user = await UserService.findByUsername(session.user.username);
    await user.changePassword(dtoIn.currentPassword, dtoIn.password);

    // perform "global logout" by deleting all refresh tokens
    // TODO "blacklist" the username and whitelist the new JWT token
    await RefreshTokenModel.deleteByUsername(session.user.username);

    // and create new token
    const token = await this._handleUserAndTokens(user, response);

    return {
      user,
      token,
    };
  }

  async list({uri, dtoIn}) {
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

  // method handles common logic for creating new token, creating new refresh token
  // and updating or adding the refreshToken to user
  async _handleUserAndTokens(user, response, refreshTokenToUpdate) {
    // create new refresh token
    // TODO optimize it, we probably dont need to create new token every ~5 minutes, but after some timeout
    const userPayload = {
      id: user._id || user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    const {refreshToken, refreshTokenId, refreshTokenTtl} = AuthenticationService.getRefreshToken(userPayload);

    // and create or update the token in the database (in register and login we create, in refreshToken we update)
    const refreshTokenData = {
      token: refreshToken,
      tid: refreshTokenId,
      expiresAt: refreshTokenTtl,
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
    response.cookie('refreshToken', refreshToken, AuthenticationService.COOKIE_OPTIONS);

    return token;
  }
}

export default new UserRoute();
