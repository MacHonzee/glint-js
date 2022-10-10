import {SecretManagerServiceClient} from '@google-cloud/secret-manager';
import Config from '../utils/config.js';
import LoggerFactory from '../logging/logger-factory.js';

class SecretManager {
  constructor() {
    this.gcpProject = Config.get('GOOGLE_CLOUD_PROJECT');
    const gcpKeyFilename = Config.get('GCP_KEY_FILENAME');

    this._logger = LoggerFactory.create('Server.SecretManager');
    this._logger.debug(`Initializing SecretManager for project with id '${this.gcpProject}'`);
    this._logger.debug(`Key path for SecretManager is '${gcpKeyFilename}'`);

    this.client = new SecretManagerServiceClient({
      projectId: this.gcpProject, // necessary for localhost
      keyFilename: gcpKeyFilename, // necessary for localhost
    });
    this._cachedSecrets = {};
  }

  async get(secretName, version = 'latest') {
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
}

export default new SecretManager();
