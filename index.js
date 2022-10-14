// services - authentication
import AuthenticationService from './src/services/authentication/authentication-service.js';
import UserService from './src/services/authentication/user-service.js';

// services - authorization
import AuthorizationService from './src/services/authorization/authorization-service.js';

// services - database
import {AbstractModel, ModelWarehouse} from './src/services/database/abstract-model.js';
import MongoClient from './src/services/database/mongo-client.js';
import mongoose from 'mongoose'; // has to be exported because new Schema checks that we are using one Mongoose lib

// services - logging
import LoggerFactory from './src/services/logging/logger-factory.js';

// services - secret-manager
import SecretManager from './src/services/secret-manager/secret-manager.js';

// services - server
import Server from './src/services/server/server.js';
import RouteRegister from './src/services/server/route-register.js';
import UseCaseEnvironment from './src/services/server/use-case-environment.js';
import UseCaseError from './src/services/server/use-case-error.js';

// services - utils
import LruCache from './src/services/utils/lru-cache.js';
import Config from './src/services/utils/config.js';

// services - validation
import ValidationService from './src/services/validation/validation-service.js';

// configs
import DefaultRoles from './src/config/default-roles.js';


// TODO describe everything with proper JSDoc
export {
  AuthenticationService,
  UserService,
  AuthorizationService,
  AbstractModel,
  ModelWarehouse,
  MongoClient,
  LoggerFactory,
  SecretManager,
  Server,
  RouteRegister,
  UseCaseEnvironment,
  UseCaseError,
  LruCache,
  Config,
  ValidationService,
  DefaultRoles,
  mongoose,
};
