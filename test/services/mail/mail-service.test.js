import { jest, afterEach, describe, it, expect } from "@jest/globals";
import { MailService } from "../../../src/index.js";

describe("MailService", () => {
  afterEach(() => {
    // Reset the singleton between tests
    MailService._instance = null;
  });

  describe("send()", () => {
    it("throws when called on the base class (no provider)", async () => {
      const service = new MailService();
      await expect(service.send({ to: "a@b.com", subject: "Hi" })).rejects.toThrow(
        "MailService.send() is not implemented",
      );
    });
  });

  describe("setInstance / getInstance", () => {
    it("stores and returns the provider instance", () => {
      class TestProvider extends MailService {
        async send() {}
      }

      const provider = new TestProvider();
      MailService.setInstance(provider);
      expect(MailService.getInstance()).toBe(provider);
    });

    it("throws when getInstance is called without setInstance", () => {
      expect(() => MailService.getInstance()).toThrow("MailService has not been initialized");
    });

    it("throws when setInstance receives a non-MailService object", () => {
      expect(() => MailService.setInstance({})).toThrow("expects an instance of MailService");
    });
  });

  describe("sendResetPasswordMail()", () => {
    it("calls send() with the reset password template", async () => {
      class TestProvider extends MailService {
        async send() {}
      }

      const provider = new TestProvider();
      jest.spyOn(provider, "send").mockResolvedValue();
      MailService.setInstance(provider);

      await provider.sendResetPasswordMail({
        to: "user@example.com",
        resetToken: "abc123",
        hostUri: "https://app.example.com",
      });

      expect(provider.send).toHaveBeenCalledTimes(1);
      const call = provider.send.mock.calls[0][0];
      expect(call.to).toBe("user@example.com");
      expect(call.subject).toBe("Password Reset Request");
      expect(call.html).toContain("https://app.example.com/resetPassword?token=abc123");
    });
  });

  describe("sendVerificationMail()", () => {
    it("calls send() with the verification template", async () => {
      class TestProvider extends MailService {
        async send() {}
      }

      const provider = new TestProvider();
      jest.spyOn(provider, "send").mockResolvedValue();
      MailService.setInstance(provider);

      await provider.sendVerificationMail({
        to: "new@example.com",
        verificationToken: "verify123",
        hostUri: "https://app.example.com",
      });

      expect(provider.send).toHaveBeenCalledTimes(1);
      const call = provider.send.mock.calls[0][0];
      expect(call.to).toBe("new@example.com");
      expect(call.subject).toBe("Verify Your Email Address");
      expect(call.html).toContain("https://app.example.com/verifyEmail?token=verify123");
    });
  });
});
