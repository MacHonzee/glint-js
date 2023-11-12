// TODO import SomeMailClient
import SecretManager from "../secret-manager/secret-manager.js";
import Config from "../utils/config.js";

class EmailService {
  constructor() {
    this.sgMail = "Some mail service";
    this.isInitialized = false;
  }

  async initialize() {
    if (!this.isInitialized) {
      const apiKey = await SecretManager.mustGet("SENDGRID_API_KEY");
      this.sgMail.setApiKey(apiKey);

      this.sender = Config.mustGet("SENDGRID_SENDER_ADDRESS");

      this.isInitialized = true;
    }
  }

  async send({ to, subject, text, html }) {
    await this.initialize();

    const msg = {
      to: to,
      from: this.sender,
      subject: subject,
      text: text,
      html: html,
    };

    await this.sgMail.send(msg);
  }
}

export default new EmailService();
