
//const { body, validationResult } = require("express-validator");
const { z } = require("zod");
// const validateSignup = [
//   body("name").notEmpty().withMessage("Name is required"),
//   body("email").isEmail().withMessage("Valid email required"),
//   body("password").isLength({ min: 6 }).withMessage("Password must be 6+ chars"),
//   (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty())
//       return res.status(400).json({ errors: errors.array() });
//     next();
//   },
// ];

// const validateLogin = [
//   body("email").isEmail().withMessage("Valid email required"),
//   body("password").notEmpty().withMessage("Password is required"),
//   (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty())
//       return res.status(400).json({ errors: errors.array() });
//     next();
//   },
// ];

// module.exports = { validateSignup, validateLogin };
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["super_admin", "site_admin", "operator", "client_admin", "client_user"]),
  organizationId: z.string().optional(),
  mfaMethod: z.enum(["none", "totp"]).optional(),
  invitationId: z.string().optional(),
  code: z.string().optional(),
});

// Signin validator
const signinSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6),
  otp: z.string().optional(),
});

// OTP validators
const sendOTPSchema = z.object({
  email: z.string().email("Invalid email"),
});

const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

// TOTP setup validator
const totpSetupSchema = z.object({
  email: z.string().email("Invalid email"),
});
const validateInvitationSchema = z.object({
  invitationId: z.string(),
  code: z.string(),
});
module.exports = {
  signupSchema,
  signinSchema,
  sendOTPSchema,
  verifyOTPSchema,
  totpSetupSchema,
  validateInvitationSchema,
};