import PermissionModel from '../models/permission-model.js';
import ValidationService from '../services/validation-service.js';
import UseCaseError from '../services/use-case-error.js';
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

class PermissionRoute {
  async grant({dtoIn, uri}) {
    await ValidationService.validate(dtoIn, uri.useCase);

    const permission = await new PermissionModel({identity: dtoIn.identity, role: dtoIn.role}).save();

    return {
      permission,
    };
  }

  async secretGrant({dtoIn, uri}) {
    await ValidationService.validate(dtoIn, uri.useCase);

    const permissionKey = await this._getPermissionKey();
    if (!permissionKey) throw new PermissionSecretNotAvailable();

    if (permissionKey !== dtoIn.secret) throw new PermissionSecretNotMatching(dtoIn.secret);

    const permission = await new PermissionModel({identity: dtoIn.identity, role: dtoIn.role}).save();

    return {
      permission,
    };
  }

  async revoke({dtoIn, uri}) {
    await ValidationService.validate(dtoIn, uri.useCase);

    let revoked;
    if (dtoIn.all) {
      await PermissionModel.deleteByUser(dtoIn.identity);
      revoked = 'all';
    } else {
      await PermissionModel.delete(dtoIn.identity, dtoIn.role);
      revoked = dtoIn.role;
    }

    return {
      revoked,
    };
  }

  async list({dtoIn, uri, authorizationResult, session}) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // set default value
    if (!dtoIn.identity) dtoIn.identity = session.user.identity;

    // allow listing only of your permissions when you are not "Admin" or "Authority"
    if (authorizationResult.userRoles.length === 1 &&
        !LIST_PRIVILEGED_ROLES.includes(authorizationResult.userRoles[0]) &&
        dtoIn.identity !== session.user.identity) {
      throw new CannotLoadRoles(authorizationResult.userRoles);
    }

    const permissions = await PermissionModel.listByUser(dtoIn.identity);

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
}

export default new PermissionRoute();
