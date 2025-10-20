const { z } = require("zod");
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["super_admin", "site_admin", "operator", "client_admin", "client_user"]),
  organizationName: z.string().min(1).optional(),
  mfaMethod: z.enum(["otp", "totp"]),
  invitationId: z.string().optional(),
  code: z.string().optional(),
});

const signinSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6),
  otp: z.string().optional(),
});

const sendOTPSchema = z.object({
  email: z.string().email("Invalid email"),
});

const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

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