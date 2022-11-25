import {SecretManagerServiceClient} from '@google-cloud/secret-manager';
import Config from '../utils/config.js';
import LoggerFactory from '../logging/logger-factory.js';

class SecretManager {
  constructor() {
    this._logger = LoggerFactory.create('Service.SecretManager');
    this._active = false;
  }

  async get(secretName, version = 'latest') {
    if (!this._active) await this._init(); // lazy initialization during first call

    this._logger.debug(`Getting secret with name '${secretName}'`);
    const secretPath = await this.getSecretPath(secretName, version);
    this._logger.debug(`Secret with name '${secretName}' has path '${secretPath}'`);

    if (this._cachedSecrets[secretPath]) return this._cachedSecrets[secretPath];

    const [secret] = await this.client.accessSecretVersion({
      name: secretPath,
    });

    const secretContent = secret.payload.data.toString();

    this._cachedSecrets[secretPath] = secretContent;
    return secretContent;
  }

  async getSecretPath(secretName, version = 'latest') {
    if (!this._active) await this._init(); // lazy initialization during first call

    return `projects/${this.gcpProject}/secrets/${secretName}/versions/${version}`;
  }

  _init() {
    this.gcpProject = Config.mustGet('GOOGLE_CLOUD_PROJECT');
    const gcpKeyFilename = Config.get('GCP_KEY_FILENAME');

    this._logger.debug(`Initializing SecretManager for project with id '${this.gcpProject}'`);
    this._logger.debug(`Key path for SecretManager is '${gcpKeyFilename}'`);

    this.client = new SecretManagerServiceClient({
      projectId: this.gcpProject, // necessary for localhost
      keyFilename: gcpKeyFilename, // necessary for localhost
    });
    this._cachedSecrets = {};
    this._active = true;
  }
}

export default new SecretManager();
