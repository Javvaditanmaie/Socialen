import request from "supertest";
import app from "../../app.js"; 

import User from "../../models/User.js";
import Organization from "../../models/Organization.js";
import authService from "../../services/authService.js";
import invitationService from "../../services/invitationService.js";
import speakeasy from "speakeasy";
import bcrypt from "bcryptjs";

jest.mock("../../models/User.js");
jest.mock("../../models/Organization.js");
jest.mock("../../services/authService.js");
jest.mock("../../services/invitationService.js");
jest.mock("speakeasy");
jest.mock("bcryptjs");

describe("Auth Controller API Tests", () => {
  const results = [];

  beforeEach(() => {
    jest.clearAllMocks();
    global.otpStore = {};
  });

  async function runTest(name, method, endpoint, payload) {
    const start = Date.now();
    let status, message, error;

    try {
      const res = await request(app)[method](endpoint).send(payload);
      status = res.statusCode;
      message = res.body?.message || "Success";
    } catch (err) {
      status = "Error";
      error = err.message;
      message = "Failed";
    }

    const duration = Date.now() - start;

    results.push({ Test: name, Endpoint: endpoint, Status: status, Duration_ms: duration, Message: message });

    console.log(
      `  Test: ${name}\n` +
      `   Endpoint: ${endpoint}\n` +
      `   Status: ${status}\n` +
      `   Message: ${message}\n` +
      `   Duration: ${duration} ms\n` +
      (error ? `   Error: ${error}\n` : "")
    );
  }

  it("Signup", async () => {
    Organization.findOne.mockResolvedValue(null);
    Organization.create.mockResolvedValue({ _id: "org123" });
    authService.registerUser.mockResolvedValue({ _id: "user123", mfaMethod: "otp" });

    await runTest("Signup", "post", "/api/auth/signup", {
      name: "John",
      email: "john@example.com",
      password: "pass123",
      role: "user",
      mfaMethod: "otp",
    });
  });

  it("Signin", async () => {
    authService.loginUser.mockResolvedValue({
      accessToken: "access123",
      refreshToken: "refresh123",
      user: { _id: "user123" },
    });

    await runTest("Signin", "post", "/api/auth/signin", {
      email: "john@example.com",
      password: "pass123",
    });
  });

  it("Login TOTP", async () => {
    User.findOne.mockResolvedValue({ _id: "user123", totpSecret: "secret", save: jest.fn(), passwordHash: "hashed" });
    speakeasy.totp.verify.mockReturnValue(true);

    await runTest("Login TOTP", "post", "/api/auth/login-totp", {
      email: "john@example.com",
      code: "123456",
    });
  });

  it("Verify TOTP", async () => {
    User.findById.mockResolvedValue({ _id: "user123", save: jest.fn() });

    await runTest("Verify TOTP", "post", "/api/auth/verify-totp", {
      email: "john@example.com",
      code: "123456",
    });
  });

  it("Assign Role", async () => {
    User.findByIdAndUpdate.mockResolvedValue({});

    await runTest("Assign Role", "post", "/api/auth/assign-role", {
      userId: "user123",
      roleId: "role456",
    });
  });

  it("Send OTP", async () => {
    await runTest("Send OTP", "post", "/api/auth/send-otp", {
      email: "john@example.com",
    });
  });

  it("Verify OTP", async () => {
    global.otpStore["john@example.com"] = { otp: "123456", expiry: Date.now() + 5000 };

    await runTest("Verify OTP", "post", "/api/auth/verify-otp", {
      email: "john@example.com",
      otp: "123456",
    });
  });

  it("Refresh Token", async () => {
    await runTest("Refresh Token", "post", "/api/auth/refresh", {
      refreshToken: "refresh123",
    });
  });

  it("Logout", async () => {
    await runTest("Logout", "post", "/api/auth/logout", {
      token: "access123",
    });
  });

  afterAll(() => {
    console.log("\nTEST SUMMARY");
    console.table(results);
  });
});
