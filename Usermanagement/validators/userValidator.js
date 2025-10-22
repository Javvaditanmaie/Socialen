import { body, param, query } from "express-validator";

export const createUserValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 chars"),
  body("role").isIn(["site_admin", "operator", "client_admin", "client_user"]).withMessage("Invalid role"),
  body("organizationId").optional().isMongoId().withMessage("organizationId must be a valid id"),
];

export const updateUserValidator = [
  param("id").isMongoId().withMessage("Invalid user id"),
  body("name").optional().isLength({ min: 2 }),
  body("email").optional().isEmail(),
  body("password").optional().isLength({ min: 6 }),
  body("role").optional().isIn(["super_admin", "site_admin", "operator", "client_admin", "client_user"]),
];

export const getUsersValidator = [
  query("page").optional().toInt(),
  query("limit").optional().toInt(),
];
