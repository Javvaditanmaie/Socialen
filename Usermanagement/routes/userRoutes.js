import express from "express";
import * as userController from "../controllers/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
  createUserValidator,
  updateUserValidator,
  getUsersValidator,
} from "../validators/userValidator.js";
import { validationResult } from "express-validator";

const router = express.Router();

function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
}

router.get(
  "/",
  authenticate,
  roleMiddleware(["super_admin", "site_admin", "operator"]),
  getUsersValidator,
  runValidation,
  userController.listUsers
);

router.get(
  "/:id",
  authenticate,
  roleMiddleware(["super_admin", "site_admin", "client_admin", "operator"]),
  userController.getUser
);

router.post(
  "/",
  authenticate,
  roleMiddleware(["super_admin", "site_admin", "client_admin", "operator"]),
  createUserValidator,
  runValidation,
  userController.createUser
);

router.put(
  "/:id",
  authenticate,
  roleMiddleware(["super_admin", "site_admin", "client_admin", "operator"]),
  updateUserValidator,
  runValidation,
  userController.updateUser
);

router.delete(
  "/:id",
  authenticate,
  roleMiddleware(["super_admin", "site_admin", "operator", "client_admin"]),
  userController.deleteUser
);

export default router;
