import request from "supertest";
import express from "express";
import userRoutes from "../../routes/userRoutes.js";

jest.mock("../../validators/userValidator.js", () => ({
  createUserValidator: (req, res, next) => next(),
  updateUserValidator: (req, res, next) => next(),
  getUsersValidator: (req, res, next) => next(),
}));
// Mock middleware and controller
jest.mock("../../middleware/authMiddleware.js", () => ({
  authenticate: (req, res, next) => {
    req.user = { sub: "123", role: "super_admin" };
    next();
  },
}));

jest.mock("../../middleware/roleMiddleware.js", () => () => (req, res, next) => next());

jest.mock("../../controllers/userController.js", () => ({
  listUsers: jest.fn((req, res) => res.json([{ id: 1, name: "Tanmaie" }])),
  getUser: jest.fn((req, res) => res.json({ id: req.params.id, name: "Tanmaie" })),
  createUser: jest.fn((req, res) => res.status(201).json({ message: "User created" })),
  updateUser: jest.fn((req, res) => res.json({ message: "User updated" })),
  deleteUser: jest.fn((req, res) => res.json({ message: "User deleted" })),
}));

// Build express app for testing
const app = express();
app.use(express.json());
app.use("/api/users", userRoutes);

describe("User Routes API Tests", () => {
  test("GET /api/users → should return all users", async () => {
    const res = await request(app).get("/api/users");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: "Tanmaie" }]);
  });

  test("GET /api/users/:id → should return one user", async () => {
    const res = await request(app).get("/api/users/1");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ id: "1", name: "Tanmaie" });
  });

  test("POST /api/users → should create a user", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Tanmaie", email: "test@gmail.com", role: "client_admin" });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("User created");
  });

  test("PUT /api/users/:id → should update a user", async () => {
    const res = await request(app)
      .put("/api/users/1")
      .send({ name: "Updated Tanmaie" });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User updated");
  });

  test("DELETE /api/users/:id → should delete a user", async () => {
    const res = await request(app).delete("/api/users/1");
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("User deleted");
  });
});
