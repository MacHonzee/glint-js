// services - authentication
import AuthenticationService from './services/authentication/authentication-service.js';
import UserService from './services/authentication/user-service.js';

// services - authorization
import AuthorizationService from './services/authorization/authorization-service.js';

// services - database
import {AbstractModel, ModelWarehouse} from './services/database/abstract-model.js';
import MongoClient from './services/database/mongo-client.js';
import mongoose from 'mongoose'; // has to be exported because new Schema checks that we are using one Mongoose lib

// services - logging
import LoggerFactory from './services/logging/logger-factory.js';

// services - secret-manager
import SecretManager from './services/secret-manager/secret-manager.js';

// services - server
import Server from './services/server/server.js';
import RouteRegister from './services/server/route-register.js';
import UseCaseEnvironment from './services/server/use-case-environment.js';
import UseCaseError from './services/server/use-case-error.js';

// services - utils
import LruCache from './services/utils/lru-cache.js';
import Config from './services/utils/config.js';

// services - validation
import ValidationService from './services/validation/validation-service.js';

// service - blob store
import BlobStore from './services/blob-store/blob-store.js';

// configs
import DefaultRoles from './config/default-roles.js';

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
  BlobStore,
};
