// TODO: Import actual mail client library (e.g., @sendgrid/mail) when ready
import SecretManager from "../secret-manager/secret-manager.js";
import Config from "../utils/config.js";

/**
 * Email message interface
 */
interface EmailMessage {
  /** Recipient email address or array of addresses */
  to: string | string[];
  /** Email subject line */
  subject: string;
  /** Plain text email body */
  text?: string;
  /** HTML email body */
  html?: string;
}

/**
 * Mock mail client interface (replace with actual client)
 */
interface MailClient {
  setApiKey: (apiKey: string) => void;
  send: (message: any) => Promise<void>;
}

/**
 * Email service for sending transactional emails.
 * Currently configured for SendGrid but can be adapted for other providers.
 *
 * Features:
 * - Lazy initialization (API key loaded from Secret Manager on first use)
 * - Support for both plain text and HTML emails
 * - Configured sender address from environment
 *
 * Configuration:
 * - SENDGRID_API_KEY: API key stored in Secret Manager
 * - SENDGRID_SENDER_ADDRESS: From address for all emails (env variable)
 *
 * @example
 * await MailService.send({
 *   to: "user@example.com",
 *   subject: "Welcome!",
 *   text: "Welcome to our app!",
 *   html: "<h1>Welcome to our app!</h1>"
 * });
 */
class EmailService {
  /** Mock SendGrid client (replace with actual import when ready) */
  private sgMail: MailClient;

  /** Whether the service has been initialized */
  private isInitialized: boolean = false;

  /** Configured sender email address */
  private sender?: string;

  constructor() {
    // TODO: Replace with actual mail client initialization
    // import sgMail from '@sendgrid/mail';
    // this.sgMail = sgMail;

    this.sgMail = {
      setApiKey: () => {},
      send: async () => {},
    };
  }

  /**
   * Initializes the email service by loading API key and sender address.
   * Called automatically on first send() call.
   * @private
   */
  private async initialize(): Promise<void> {
    if (!this.isInitialized) {
      const apiKey = await SecretManager.mustGet("SENDGRID_API_KEY");
      this.sgMail.setApiKey(apiKey);

      this.sender = Config.mustGet("SENDGRID_SENDER_ADDRESS");

      this.isInitialized = true;
    }
  }

  /**
   * Sends an email message.
   * Automatically initializes the service on first use.
   *
   * @param message - Email message with recipient, subject, and body
   * @throws Error if initialization fails or email sending fails
   *
   * @example
   * // Send plain text email
   * await MailService.send({
   *   to: "user@example.com",
   *   subject: "Password Reset",
   *   text: "Click here to reset your password..."
   * });
   *
   * // Send HTML email
   * await MailService.send({
   *   to: ["user1@example.com", "user2@example.com"],
   *   subject: "Newsletter",
   *   html: "<h1>Monthly Newsletter</h1><p>...</p>"
   * });
   */
  async send({ to, subject, text, html }: EmailMessage): Promise<void> {
    await this.initialize();

    const msg = {
      to: to,
      from: this.sender!,
      subject: subject,
      text: text,
      html: html,
    };

    await this.sgMail.send(msg);
  }
}

export default new EmailService();
