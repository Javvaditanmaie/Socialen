import request from "supertest";
import app from "../../app.js"; // your Express app
import ExcelJS from "exceljs";

// Mock models and services
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
    let status, error;
    try {
      const res = await request(app)[method](endpoint).send(payload);
      status = res.statusCode;
    } catch (err) {
      status = "Error";
      error = err.message;
    }
    const duration = Date.now() - start;
    results.push({ name, endpoint, status, duration, error });
    console.log(`Test: ${name}, Status: ${status}, Duration: ${duration}ms`);
  }

  it("Run all endpoint tests and export to Excel", async () => {
    // Example Mocks
    Organization.findOne.mockResolvedValue(null);
    Organization.create.mockResolvedValue({ _id: "org123" });
    authService.registerUser.mockResolvedValue({ _id: "user123", mfaMethod: "otp" });
    authService.loginUser.mockResolvedValue({ accessToken: "access123", refreshToken: "refresh123", user: { _id: "user123" } });
    User.findOne.mockResolvedValue({ _id: "user123", totpSecret: "secret", save: jest.fn(), passwordHash: "hashed" });
    User.findById.mockResolvedValue({ _id: "user123", save: jest.fn() });
    User.findByIdAndUpdate.mockResolvedValue({});
    speakeasy.totp.verify.mockReturnValue(true);
    bcrypt.hash.mockResolvedValue("hashedToken");

    // List of tests
    await runTest("Signup", "post", "/api/auth/signup", { name: "John", email: "john@example.com", password: "pass123", role: "user", mfaMethod: "otp" });
    await runTest("Signin", "post", "/api/auth/signin", { email: "john@example.com", password: "pass123" });
    await runTest("LoginTOTP", "post", "/api/auth/login-totp", { email: "john@example.com", code: "123456" });
    await runTest("VerifyTOTP", "post", "/api/auth/verify-totp", { email: "john@example.com", code: "123456" });
    await runTest("AssignRole", "post", "/api/auth/assign-role", { userId: "user123", roleId: "role456" });
    await runTest("SendOTP", "post", "/api/auth/send-otp", { email: "john@example.com" });
    global.otpStore["john@example.com"] = { otp: "123456", expiry: Date.now() + 5000 };
    await runTest("VerifyOTP", "post", "/api/auth/verify-otp", { email: "john@example.com", otp: "123456" });

    // Export results to Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("API Test Results");

    sheet.columns = [
      { header: "Test Name", key: "name", width: 20 },
      { header: "Endpoint", key: "endpoint", width: 25 },
      { header: "Status", key: "status", width: 10 },
      { header: "Duration (ms)", key: "duration", width: 15 },
      { header: "Error", key: "error", width: 30 },
    ];

    results.forEach(r => sheet.addRow(r));

    await workbook.xlsx.writeFile("api_test_results.xlsx");
    console.log("Excel file generated: api_test_results.xlsx");
  });
});
