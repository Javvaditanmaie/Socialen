import request from "supertest";
import app from "../../app.js";
import Invitation from "../../models/Invitation.js";
import invitationService from "../../services/invitationService.js";
import { publishEvent } from "../../rabbitmq/publisher.js";

jest.mock("../../models/Invitation.js");
jest.mock("../../services/invitationService.js");
jest.mock("../../rabbitmq/publisher.js");

describe("Invitation API Tests", () => {
  const results = []; 

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function runWithTiming(testName, testFn) {
    const start = Date.now();
    try {
      await testFn();
      const duration = Date.now() - start;
      results.push({ Test: testName, Status: "Passed ", Duration_ms: duration });
      console.log(`  ${testName} - ${duration} ms`);
    } catch (err) {
      const duration = Date.now() - start;
      results.push({ Test: testName, Status: "Failed ", Duration_ms: duration });
      console.error(` ${testName} failed (${duration} ms):`, err.message);
      throw err; 
    }
  }

  test("POST /api/invitations/create - success", async () => {
    await runWithTiming("Create Invitation", async () => {
      Invitation.findOne.mockResolvedValue(null);
      invitationService.createInvitation.mockResolvedValue({
        invitationId: "inv123",
        code: "abc123",
        email: "user@example.com",
        role: "client_user",
        organization: null,
        expiresAt: new Date()
      });
      publishEvent.mockResolvedValue(true);

      const res = await request(app)
        .post("/api/invitations/create")
        .send({
          email: "user@example.com",
          role: "client_user"
        })
        .set("Authorization", "Bearer fake-jwt");

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("message");
      expect(res.body.invitation).toHaveProperty("invitationId");
    });
  });

  test("GET /api/invitations/accept - expired invitation", async () => {
    await runWithTiming("Accept Expired Invitation", async () => {
      Invitation.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
        used: false
      });

      const res = await request(app)
        .get("/api/invitations/accept")
        .query({ invitationId: "inv123", code: "xyz789" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invitation expired");
    });
  });

  test("GET /api/invitations/verify - valid invitation", async () => {
    await runWithTiming("Verify Invitation", async () => {
      Invitation.findOne.mockResolvedValue({
        status: "pending",
        expiresAt: new Date(Date.now() + 1000 * 60),
        email: "user@example.com",
        role: "client_user",
        save: jest.fn()
      });

      const res = await request(app)
        .get("/api/invitations/verify")
        .query({ invitationId: "inv123", code: "xyz789" });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Invitation verified successfully");
    });
  });

  afterAll(() => {
    console.log("\n TEST SUMMARY");
    console.table(results);
  });
});
