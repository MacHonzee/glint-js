import SgMail from "@sendgrid/mail";
import { jest, beforeEach, describe, it, expect } from "@jest/globals";
import { MailService, SecretManager, Config } from "../../../src/index.js";

jest.spyOn(SecretManager, "mustGet");
jest.spyOn(SgMail, "setApiKey").mockImplementation();
jest.spyOn(SgMail, "send").mockImplementation();

describe("MailService", () => {
  const mockApiKey = "MOCK_API_KEY";
  const mockSender = "MOCK_SENDER";
  const mockEmail = {
    to: "test@example.com",
    subject: "Test Email",
    text: "This is a test email",
    html: "<p>This is a test email</p>",
  };

  beforeEach(() => {
    // Setup mock for SecretManager
    SecretManager.mustGet.mockImplementation((key) => {
      if (key === "SENDGRID_API_KEY") return mockApiKey;
      throw new Error("Invalid key");
    });

    // Setup configuration values
    Config.set("SENDGRID_SENDER_ADDRESS", mockSender);

    // Clear any previous mock implementation or calls
    jest.clearAllMocks();
  });

  it("initializes correctly", async () => {
    await MailService.initialize();
    expect(SgMail.setApiKey).toHaveBeenCalledWith(mockApiKey);
    expect(SecretManager.mustGet).toHaveBeenCalledWith("SENDGRID_API_KEY");
  });

  it("sends email correctly", async () => {
    await MailService.send(mockEmail);
    expect(SgMail.send).toHaveBeenCalledWith({
      ...mockEmail,
      from: mockSender,
    });
  });
});
