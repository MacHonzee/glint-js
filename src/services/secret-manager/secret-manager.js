import {SecretManagerServiceClient} from '@google-cloud/secret-manager';
import Config from '../utils/config.js';
import LoggerFactory from '../logging/logger-factory.js';

class SecretManager {
  constructor() {
    this._logger = LoggerFactory.create('SecretManager');

    this.disabled = Config.get('SECRET_MANAGER_DISABLED', Boolean);
    if (!this.disabled) {
      this._init();
    } else {
      this._logger.info('SecretManager is disabled.');
    }
  }

  async get(secretName, version = 'latest') {
    if (this.disabled) throw new Error('SecretManager is disabled, cannot get secret.');

    this._logger.debug(`Getting secret with name '${secretName}'`);
    const secretPath = this.getSecretPath(secretName, version);
    this._logger.debug(`Secret with name '${secretName}' has path '${secretPath}'`);

    if (this._cachedSecrets[secretPath]) return this._cachedSecrets[secretPath];

    const [secret] = await this.client.accessSecretVersion({
      name: secretPath,
    });

    const secretContent = secret.payload.data.toString();

    this._cachedSecrets[secretPath] = secretContent;
    return secretContent;
  }

  getSecretPath(secretName, version = 'latest') {
    return `projects/${this.gcpProject}/secrets/${secretName}/versions/${version}`;
  }

  _init() {
    this.gcpProject = Config.get('GOOGLE_CLOUD_PROJECT');
    const gcpKeyFilename = Config.get('GCP_KEY_FILENAME');

    this._logger.debug(`Initializing SecretManager for project with id '${this.gcpProject}'`);
    this._logger.debug(`Key path for SecretManager is '${gcpKeyFilename}'`);

    this.client = new SecretManagerServiceClient({
      projectId: this.gcpProject, // necessary for localhost
      keyFilename: gcpKeyFilename, // necessary for localhost
    });
    this._cachedSecrets = {};
  }
}

export default new SecretManager();
