import PermissionModel from '../models/permission-model.js';
import UserModel from '../models/user-model.js';
import ValidationService from '../services/validation/validation-service.js';
import UseCaseError from '../services/server/use-case-error.js';
import DefaultRoles from '../config/default-roles.js';

const LIST_PRIVILEGED_ROLES = [DefaultRoles.admin, DefaultRoles.authority];

class CannotLoadRoles extends UseCaseError {
  constructor(userRoles) {
    super(
        'You are not authorized to load roles of other users.',
        'cannotLoadRoles',
        {userRoles, privilegedRoles: LIST_PRIVILEGED_ROLES},
    );
  }
}

class PermissionSecretNotAvailable extends UseCaseError {
  constructor() {
    super(
        'Application is not deployed with any configuration to permission secret, contact administrator.',
        'permissionSecretNotAvailable',
    );
  }
}

class PermissionSecretNotMatching extends UseCaseError {
  constructor(secret) {
    super(
        'Permission secret is not matching',
        'permissionSecretNotMatching',
        {secret},
    );
  }
}

class UserNotFound extends UseCaseError {
  constructor(user) {
    super(
        'User with given username was not found.',
        'userNotFound',
        {user},
    );
  }
}

class PermissionRoute {
  async grant({dtoIn, uri}) {
    await ValidationService.validate(dtoIn, uri.useCase);

    await this._checkUser(dtoIn.user);

    const permission = await new PermissionModel({user: dtoIn.user, role: dtoIn.role}).save();

    return {
      permission,
    };
  }

  async secretGrant({dtoIn, uri}) {
    await ValidationService.validate(dtoIn, uri.useCase);

    const permissionKey = await this._getPermissionKey();
    if (!permissionKey) throw new PermissionSecretNotAvailable();

    if (permissionKey !== dtoIn.secret) throw new PermissionSecretNotMatching(dtoIn.secret);

    await this._checkUser(dtoIn.user);

    const permission = await new PermissionModel({user: dtoIn.user, role: dtoIn.role}).save();

    return {
      permission,
    };
  }

  async revoke({dtoIn, uri}) {
    await ValidationService.validate(dtoIn, uri.useCase);

    let revoked;
    if (dtoIn.all) {
      await PermissionModel.deleteByUser(dtoIn.user);
      revoked = 'all';
    } else {
      await PermissionModel.delete(dtoIn.user, dtoIn.role);
      revoked = dtoIn.role;
    }

    return {
      revoked,
    };
  }

  async list({dtoIn, uri, authorizationResult, session}) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // set default value
    if (!dtoIn.user) dtoIn.user = session.user.user;

    // allow listing only of your permissions when you are not "Admin" or "Authority"
    if (authorizationResult.userRoles.length === 1 &&
        !LIST_PRIVILEGED_ROLES.includes(authorizationResult.userRoles[0]) &&
        dtoIn.user !== session.user.user) {
      throw new CannotLoadRoles(authorizationResult.userRoles);
    }

    const permissions = await PermissionModel.listByUser(dtoIn.user);

    return {
      permissions,
    };
  }

  async _getPermissionKey() {
    const permissionKey = process.env.PERMISSION_GRANT_KEY;
    if (!permissionKey) {
      const permissionSecret = process.env.PERMISSION_GRANT_SECRET;

      if (!permissionSecret) {
        return;
      }

      // TODO resolve it from Google secrets by some secret manager
    }

    return permissionKey;
  }

  async _checkUser(user) {
    const userObject = await UserModel.findByUsername(user);
    if (!userObject) {
      throw new UserNotFound(user);
    }
    return userObject;
  }
}

export default new PermissionRoute();
