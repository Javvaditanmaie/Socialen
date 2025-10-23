import * as authController from "../../controllers/authController.js";
import User from "../../models/User.js";
import Organization from "../../models/Organization.js";
import authService from "../../services/authService.js";
import invitationService from "../../services/invitationService.js";
import speakeasy from "speakeasy";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import amqp from "amqplib";

jest.mock("../../models/User.js");
jest.mock("../../models/Organization.js");
jest.mock("../../services/authService.js");
jest.mock("../../services/invitationService.js");
jest.mock("speakeasy");
jest.mock("jsonwebtoken");
jest.mock("bcryptjs");
jest.mock("amqplib");


const mockChannel = {
  assertExchange: jest.fn(),
  publish: jest.fn(),
  close: jest.fn().mockResolvedValue(true),
};
const mockConnection = {
  createChannel: jest.fn().mockResolvedValue(mockChannel),
  close: jest.fn().mockResolvedValue(true),
};
amqp.connect.mockResolvedValue(mockConnection);

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

describe("authController Unit Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
    global.otpStore = {};
  });

  describe("signup", () => {
    it("should register a user with TOTP", async () => {
      const req = {
        body: { name: "Test", email: "test@gmail.com", password: "123456", role: "super_admin", mfaMethod: "totp" },
        user: { sub: "adminId" },
      };
      const res = mockResponse();

      // Mock Organization methods
      Organization.findOne.mockResolvedValue(null);
      Organization.create.mockResolvedValue({ _id: "org1", name: "TestOrg", slug: "testorg" });

      // Mock authService
      authService.registerUser.mockResolvedValue({ _id: "1", email: "test@gmail.com", mfaMethod: "totp" });

      await authController.signup(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining("TOTP") })
      );
    });

    it("should return 400 if required fields missing", async () => {
      const req = { body: {} };
      const res = mockResponse();

      await authController.signup(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("signin", () => {
    it("should login successfully without TOTP", async () => {
      const req = { body: { email: "test@gmail.com", password: "123456" }, cookies: {} };
      const res = mockResponse();

      User.findOne.mockResolvedValue({ totpEnabled: false });
      authService.loginUser.mockResolvedValue({ accessToken: "token", refreshToken: "refresh", user: { id: "1" } });

      await authController.signin(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: "token" }));
    });

    it("should return 400 if TOTP required but not provided", async () => {
      const req = { body: { email: "test@gmail.com", password: "123456" } };
      const res = mockResponse();

      User.findOne.mockResolvedValue({ totpEnabled: true, totpSecret: "secret" });

      await authController.signin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "TOTP required" }));
    });
  });

  // ---------- loginTOTP ----------
  describe("loginTOTP", () => {
    it("should verify TOTP successfully", async () => {
      const req = { body: { email: "test@gmail.com", code: "123456" } };
      const res = mockResponse();

      User.findOne.mockResolvedValue({ _id: "1", email: "test@gmail.com", role: "admin", totpSecret: "secret", save: jest.fn().mockResolvedValue(true) });
      speakeasy.totp.verify.mockReturnValue(true);
      bcrypt.hash.mockResolvedValue("hashedRefresh");
      jwt.sign.mockReturnValue("accessToken");

      await authController.loginTOTP(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "TOTP verified successfully" }));
    });

    it("should return 400 if TOTP invalid", async () => {
      const req = { body: { email: "test@gmail.com", code: "123456" } };
      const res = mockResponse();

      User.findOne.mockResolvedValue({ totpSecret: "secret" });
      speakeasy.totp.verify.mockReturnValue(false);

      await authController.loginTOTP(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Invalid or expired TOTP code" }));
    });
  });

  // ---------- totpSetup ----------
  describe("totpSetup", () => {
    it("should return existing TOTP secret if already set", async () => {
      const req = { body: { email: "test@gmail.com" } };
      const res = mockResponse();

      User.findOne.mockResolvedValue({ email: "test@gmail.com", mfaMethod: "totp", totpSecret: "existingSecret" });

      await authController.totpSetup(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ secretKey: "existingSecret" }));
    });
  });

  // ---------- verifyTotp ----------
  describe("verifyTotp", () => {
    it("should verify TOTP successfully", async () => {
      const req = { body: { email: "test@gmail.com", code: "123456" } };
      const res = mockResponse();

      const saveMock = jest.fn();
      User.findOne.mockResolvedValue({ totpSecret: "secret", save: saveMock });
      speakeasy.totp.verify.mockReturnValue(true);

      await authController.verifyTotp(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ verified: true }));
    });

    it("should fail if TOTP invalid", async () => {
      const req = { body: { email: "test@gmail.com", code: "123456" } };
      const res = mockResponse();

      User.findOne.mockResolvedValue({ totpSecret: "secret" });
      speakeasy.totp.verify.mockReturnValue(false);

      await authController.verifyTotp(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Invalid or expired TOTP code" }));
    });
  });

  // ---------- sendOTP / verifyOTP ----------
  describe("sendOTP / verifyOTP", () => {
    it("should send OTP successfully", async () => {
      const req = { body: { email: "test@gmail.com" } };
      const res = mockResponse();

      await authController.sendOTP(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "OTP sent successfully!" }));
    });

    it("should verify OTP successfully", async () => {
      global.otpStore = { "test@gmail.com": { otp: "123456", expiry: Date.now() + 5000 } };
      const req = { body: { email: "test@gmail.com", otp: "123456" } };
      const res = mockResponse();

      User.findOne.mockResolvedValue({ _id: "1" });
      User.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

      await authController.verifyOTP(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "OTP verified successfully!" }));
    });

  });
  // ---------- assignRole ----------
  describe("assignRole", () => {
    it("should assign role successfully", async () => {
      const req = { body: { userId: "1", roleId: "admin" } };
      const res = mockResponse();

      User.findById.mockResolvedValue({ _id: "1", email: "test@gmail.com", role: "user", save: jest.fn().mockResolvedValue(true) });

      await authController.assignRole(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Role assigned successfully" }));
    });

    it("should return 404 if user not found", async () => {
      const req = { body: { userId: "notfound", roleId: "admin" } };
      const res = mockResponse();

      User.findById.mockResolvedValue(null);

      await authController.assignRole(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "User not found" }));
    });
  });

  // ---------- refresh ----------
  describe("refresh", () => {
    it("should return new access token", async () => {
      const req = { 
        cookies: { refreshToken: "refresh" },
        body: {}
      };
      const res = mockResponse();

      authService.refreshAccessToken.mockResolvedValue({ accessToken: "newAccessToken", refreshToken: "newRefreshToken" });

      await authController.refresh(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: "newAccessToken" }));
    });

    it("should return 401 if refresh token missing", async () => {
      const req = { cookies: {}, body: {} };
      const res = mockResponse();

      await authController.refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Refresh token required" }));
    });
  });

  // ---------- logout ----------
  describe("logout", () => {
    it("should clear cookies and logout successfully", async () => {
      const req = {};
      const res = mockResponse();

      await authController.logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", { httpOnly: true, sameSite: "strict" });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Logged out successfully" }));
    });
  });

  // ---------- getProfile ----------
  describe("getProfile", () => {
    it("should return user profile", async () => {
      const req = { user: { sub: "1" } };
      const res = mockResponse();

      const mockUser = { _id: "1", email: "test@gmail.com", name: "Test" };
      const mockPopulate2 = jest.fn().mockResolvedValue(mockUser);
      const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
      User.findById.mockReturnValue({ populate: mockPopulate1 });

      await authController.getProfile(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: mockUser }));
    });
  });

  // ---------- updateProfile ----------
  describe("updateProfile", () => {
    it("should update user profile successfully", async () => {
      const req = { user: { _id: "1" }, body: { name: "UpdatedName" } };
      const res = mockResponse();

      User.findByIdAndUpdate.mockResolvedValue({ _id: "1", email: "test@gmail.com", name: "UpdatedName" });

      await authController.updateProfile(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Profile updated", user: expect.objectContaining({ name: "UpdatedName" }) }));
    });
  });

  // ---------- validateInvitation ----------
  describe("validateInvitation", () => {
    it("should validate invitation successfully", async () => {
      const req = { query: { invitationId: "invitationId", code: "code" } };
      const res = mockResponse();

      invitationService.validateInvitation.mockResolvedValue({ email: "test@gmail.com", role: "admin", status: "pending" });

      await authController.validateInvitation(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Invitation is valid", email: "test@gmail.com" }));
    });

    it("should return 400 if invitation invalid", async () => {
      const req = { query: { invitationId: "invalidId", code: "invalidCode" } };
      const res = mockResponse();

      invitationService.validateInvitation.mockRejectedValue(new Error("Invalid invitation token"));

      await authController.validateInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Invalid invitation token" }));
    });
  });
});
