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

    // get token and refreshToken, update the refreshToken in DB
    const token = AuthenticationService.getToken({_id: registeredUser._id});
    const refreshToken = AuthenticationService.getRefreshToken({_id: registeredUser._id});
    registeredUser.refreshTokens.push(refreshToken);
    await registeredUser.save();

    // and return refreshToken in cookies
    response.cookie('refreshToken', refreshToken, AuthenticationService.COOKIE_OPTIONS);

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
      console.log('-> error', error);
      throw new LoginFailed(error);
    }

    // get tokens and set the refreshToken cookie up
    const token = AuthenticationService.getToken({_id: user._id});
    const refreshToken = AuthenticationService.getRefreshToken({_id: user._id});
    response.cookie('refreshToken', refreshToken, AuthenticationService.COOKIE_OPTIONS);

    return {
      user,
      token,
    };
  }

  async refreshToken(ucEnv) {}

  async logout(ucEnv) {}
}

export default new UserRoute();
