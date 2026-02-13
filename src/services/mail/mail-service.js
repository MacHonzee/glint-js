import LoggerFactory from "../logging/logger-factory.js";

/**
 * Base class for mail services. Provides high-level methods for sending
 * application emails (reset password, verification, etc.) and a low-level
 * `send()` method that must be implemented by a concrete provider.
 *
 * Usage:
 * ```
 * import { MailService } from "glint-js";
 *
 * class BrevoMailService extends MailService {
 *   async send({ to, subject, text, html }) {
 *     // provider-specific implementation
 *   }
 * }
 *
 * MailService.setInstance(new BrevoMailService());
 * ```
 */
class MailService {
  logger = LoggerFactory.create("MailService");

  /**
   * Low-level send method. Must be implemented by a concrete provider subclass.
   *
   * @param {object} params
   * @param {string} params.to - Recipient email address.
   * @param {string} params.subject - Email subject.
   * @param {string} [params.text] - Plain text body.
   * @param {string} [params.html] - HTML body.
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async send({ to, subject, text, html }) {
    throw new Error(
      "MailService.send() is not implemented. " +
        "Extend MailService and override send() to provide a mail provider, then call MailService.setInstance().",
    );
  }

  /**
   * Sends a password-reset email. Override this method to customise the
   * template or subject line.
   *
   * @param {object} params
   * @param {string} params.to - Recipient email address.
   * @param {string} params.resetToken - The password-reset JWT token.
   * @param {string} params.hostUri - Application host URI used to build the reset link.
   * @returns {Promise<void>}
   */
  async sendResetPasswordMail({ to, resetToken, hostUri }) {
    const resetLink = `${hostUri}/resetPassword?token=${resetToken}`;

    await this.send({
      to,
      subject: "Password Reset Request",
      html: `<div>
    <p>Hello,</p>
    <p>We received a request to reset your password. If you did not request this, you can safely ignore this email.</p>
    <p>Click the link below to set a new password. The link is valid for 24 hours.</p>
    <ul><li><b><a href="${resetLink}">RESET PASSWORD</a></b></li></ul>
    <br/>
    <p>Please do not reply to this email — it was generated automatically.</p>
</div>`,
    });
  }

  /**
   * Sends a registration-verification email. Override this method to
   * customise the template or subject line.
   *
   * @param {object} params
   * @param {string} params.to - Recipient email address.
   * @param {string} params.verificationToken - The email-verification token.
   * @param {string} params.hostUri - Application host URI used to build the verification link.
   * @returns {Promise<void>}
   */
  async sendRegistrationVerificationMail({ to, verificationToken, hostUri }) {
    const verifyLink = `${hostUri}/verifyEmail?token=${verificationToken}`;

    await this.send({
      to,
      subject: "Verify Your Email Address",
      html: `<div>
    <p>Hello,</p>
    <p>Thank you for registering. Please verify your email address by clicking the link below.</p>
    <ul><li><b><a href="${verifyLink}">VERIFY EMAIL</a></b></li></ul>
    <br/>
    <p>If you did not create an account, you can safely ignore this email.</p>
</div>`,
    });
  }

  // ---------------------------------------------------------------------------
  // Static service-locator methods
  // ---------------------------------------------------------------------------

  /** @type {MailService | null} */
  static _instance = null;

  /**
   * Register a concrete MailService provider instance.
   *
   * @param {MailService} instance
   */
  static setInstance(instance) {
    if (!(instance instanceof MailService)) {
      throw new Error("MailService.setInstance() expects an instance of MailService (or a subclass).");
    }
    MailService._instance = instance;
  }

  /**
   * Retrieve the registered MailService instance.
   *
   * @returns {MailService}
   */
  static getInstance() {
    if (!MailService._instance) {
      throw new Error(
        "MailService has not been initialized. " +
          "Call MailService.setInstance() with a provider during application bootstrap.",
      );
    }
    return MailService._instance;
  }
}

export default MailService;
