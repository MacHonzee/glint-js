import {SecretManagerServiceClient} from '@google-cloud/secret-manager';
import Config from '../utils/config.js';

class SecretManager {
  gcpProject = Config.get('GOOGLE_CLOUD_PROJECT');
  client = new SecretManagerServiceClient({
    projectId: this.gcpProject, // necessary for localhost
    keyFilename: Config.get('GCP_KEY_FILENAME'), // necessary for localhost
  });
  _cachedSecrets = {};

  async get(secretName, version = 'latest') {
    const secretPath = this.getSecretPath(secretName, version);
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
