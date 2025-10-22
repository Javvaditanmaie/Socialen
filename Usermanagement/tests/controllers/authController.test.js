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
    let status, error, message;

    try {
      const res = await request(app)[method](endpoint).send(payload);
      status = res.statusCode;
      message = res.body?.message || "Success";
    } catch (err) {
      status = "Error";
      error = err.message;
    }

    const duration = Date.now() - start;
    results.push({ name, endpoint, status, duration, message, error });

    console.log(
      `  Test: ${name}\n` +
      `   Endpoint: ${endpoint}\n` +
      `   Status: ${status}\n` +
      `   Message: ${message || "N/A"}\n` +
      `   Duration: ${duration} ms\n` +
      (error ? `   Error: ${error}\n` : "")
    );
  }

  it("Run all endpoint tests and show status in console", async () => {
    Organization.findOne.mockResolvedValue(null);
    Organization.create.mockResolvedValue({ _id: "org123" });
    authService.registerUser.mockResolvedValue({ _id: "user123", mfaMethod: "otp" });
    authService.loginUser.mockResolvedValue({
      accessToken: "access123",
      refreshToken: "refresh123",
      user: { _id: "user123" },
    });
    User.findOne.mockResolvedValue({
      _id: "user123",
      totpSecret: "secret",
      save: jest.fn(),
      passwordHash: "hashed",
    });
    User.findById.mockResolvedValue({ _id: "user123", save: jest.fn() });
    User.findByIdAndUpdate.mockResolvedValue({});
    speakeasy.totp.verify.mockReturnValue(true);
    bcrypt.hash.mockResolvedValue("hashedToken");
    await runTest("Signup", "post", "/api/auth/signup", {
      name: "John",
      email: "john@example.com",
      password: "pass123",
      role: "user",
      mfaMethod: "otp",
    });

    await runTest("Signin", "post", "/api/auth/signin", {
      email: "john@example.com",
      password: "pass123",
    });

    await runTest("Login TOTP", "post", "/api/auth/login-totp", {
      email: "john@example.com",
      code: "123456",
    });

    await runTest("Verify TOTP", "post", "/api/auth/verify-totp", {
      email: "john@example.com",
      code: "123456",
    });

    await runTest("Assign Role", "post", "/api/auth/assign-role", {
      userId: "user123",
      roleId: "role456",
    });

    await runTest("Send OTP", "post", "/api/auth/send-otp", {
      email: "john@example.com",
    });

    global.otpStore["john@example.com"] = {
      otp: "123456",
      expiry: Date.now() + 5000,
    };

    await runTest("Verify OTP", "post", "/api/auth/verify-otp", {
      email: "john@example.com",
      otp: "123456",
    });

    await runTest("Refresh Token", "post", "/api/auth/refresh", {
      refreshToken: "refresh123",
    });

    await runTest("Logout", "post", "/api/auth/logout", {
      token: "access123",
    });

  
    console.log(" Test Summary ");
    console.table(
      results.map((r) => ({
        Test: r.name,
        Endpoint: r.endpoint,
        Status: r.status,
        Duration_ms: r.duration,
        Message: r.message,
      }))
    );
  });
});
