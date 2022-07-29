import UserModel from '../models/user-model.js';
import ValidationService from '../services/validation/validation-service.js';
import UseCaseError from '../services/server/use-case-error.js';
import LoggerFactory from '../services/logging/logger-factory.js';
import AuthenticationService from '../services/authentication/authentication-service.js';

class RegistrationFailed extends UseCaseError {
  constructor(cause) {
    super(
        'Registration has failed.',
        'registrationFailed',
        {cause},
    );
  }
}

class LoginFailed extends UseCaseError {
  constructor(cause) {
    super(
        'Login has failed.',
        'registrationFailed',
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
        'invalidRefreshToken',
    );
  }
}

class UserRoute {
  constructor() {
    this.logger = LoggerFactory.create('Route.UserRoute');
  }

  async register({dtoIn, uri, response}) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // create model for user
    const newUser = new UserModel({
      username: dtoIn.username,
      firstName: dtoIn.firstName,
      lastName: dtoIn.lastName,
      language: dtoIn.language,
    });

    // save user to database to check constraints
    let registeredUser;
    try {
      registeredUser = await UserModel.register(newUser, dtoIn.password);
    } catch (e) {
      this.logger.error(e);
      throw new RegistrationFailed(e.message);
    }

    const token = await this._handleUserAndTokens(registeredUser, response);

    return {
      token,
      registeredUser,
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

    // TODO we must handle deletion of some old expired tokens
    const token = await this._handleUserAndTokens(user, response);

    return {
      user,
      token,
    };
  }

  async refreshToken({request, response}) {
    const refreshToken = request.signedCookies?.refreshToken;
    console.log('-> refreshToken', refreshToken);
    if (!InvalidRefreshToken) throw new InvalidRefreshToken();

    // verify that token has been signed with correct secret
    const jwtData = AuthenticationService.verifyRefreshToken(refreshToken);

    // find user based on the signed token id
    const userId = jwtData._id;
    const user = await UserModel.findOne({_id: userId});

    // verify that the token is saved to given user (could be deleted because of logout)
    const tokenIndex = user.refreshTokens.findIndex( (item) => item === refreshToken );
    if (tokenIndex === -1) {
      throw new RefreshTokenMismatch();
    }

    const token = await this._handleUserAndTokens(user, response, tokenIndex);

    return {
      token,
    };
  }

  async logout(ucEnv) {}

  // method handles common logic for creating new token, creating new refresh token
  // and updating or adding the refreshToken to user
  async _handleUserAndTokens(user, response, tokenIndex) {
    const refreshToken = AuthenticationService.getRefreshToken({_id: user._id});
    if (tokenIndex != null) {
      user.refreshTokens[tokenIndex] = refreshToken;
    } else {
      user.refreshTokens.push(refreshToken);
    }
    await user.save();

    const token = AuthenticationService.getToken({_id: user._id});
    response.cookie('refreshToken', refreshToken, AuthenticationService.COOKIE_OPTIONS);

    return token;
  }
}

export default new UserRoute();
