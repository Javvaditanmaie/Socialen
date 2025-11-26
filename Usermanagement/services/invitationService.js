import Invitation from "../models/Invitation.js";
import generateInvitationCode from "../utils/invitationCode.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { sendMail, transporter } from "./emailService.js";
import dbAdapter from "../db/dbAdapter.js";


// -----------------------------------------------------------
// CREATE INVITATION
// -----------------------------------------------------------
export async function createInvitation({
  email,
  role,
  method,
  createdBy,
  organizationId,
  expiresInDays,
}) {
  const invitationData = {
    invitationId: uuidv4(),
    code: generateInvitationCode(),
    email,
    role,
    method,
    createdBy,
    status: "pending",
    organizationId: organizationId || null,
    expiresAt: new Date(Date.now() + (expiresInDays || 7) * 24 * 60 * 60 * 1000),
  };

  return dbAdapter.create(Invitation, invitationData);
}


// -----------------------------------------------------------
// VALIDATE INVITATION
// -----------------------------------------------------------
export async function validateInvitation(invitationId, code) {
  const inv = await dbAdapter.findOne(Invitation, { invitationId });

  if (!inv) throw { status: 404, message: "Invitation not found" };
  if (inv.status !== "pending")
    throw { status: 400, message: "Invitation not available" };

  if (inv.expiresAt < new Date()) {
    await dbAdapter.findByIdAndUpdate(Invitation, inv._id, { status: "expired" });
    throw { status: 400, message: "Invitation expired" };
  }

  if (inv.code && code && inv.code !== code)
    throw { status: 400, message: "Invalid invitation code" };

  return inv;
}


// -----------------------------------------------------------
// GENERATE + SEND OTP TO EMAIL
// -----------------------------------------------------------
export async function generateAndSendEmailOtp(invitation) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 12);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await dbAdapter.findByIdAndUpdate(
    Invitation,
    invitation._id,
    {
      otpHash,
      otpExpiresAt,
    },
    { new: true }
  );

  await sendMail({
    to: invitation.email,
    subject: "Your signup OTP",
    text: `Your signup code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your signup code is <b>${otp}</b>. It expires in 10 minutes.</p>`,
  });

  return { sent: true };
}


// -----------------------------------------------------------
// VERIFY INVITATION OTP
// -----------------------------------------------------------
export async function verifyInvitationOtp(invitationId, otpPlain) {
  const inv = await dbAdapter.findOne(Invitation, { invitationId });

  if (!inv) throw { status: 404, message: "Invitation not found" };
  if (!inv.otpHash || !inv.otpExpiresAt)
    throw { status: 400, message: "No OTP issued" };
  if (inv.otpExpiresAt < new Date())
    throw { status: 400, message: "OTP expired" };

  const match = await bcrypt.compare(otpPlain, inv.otpHash);
  if (!match) throw { status: 400, message: "Invalid OTP" };

  return inv;
}


// -----------------------------------------------------------
// MARK INVITATION AS USED
// -----------------------------------------------------------
export async function markUsed(invitationId) {
  const inv = await dbAdapter.findOne(Invitation, { invitationId });

  if (!inv) throw { status: 404, message: "Invitation not found" };

  return dbAdapter.findByIdAndUpdate(
    Invitation,
    inv._id,
    { status: "used", used: true, usedAt: new Date() },
    { new: true }
  );
}


// -----------------------------------------------------------
// SEND EMAIL (unchanged)
// -----------------------------------------------------------
export async function sendInvitationEmail(to, subject, text, html) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  };

  await transporter.sendMail(mailOptions);
}


// -----------------------------------------------------------
// EXPORT
// -----------------------------------------------------------
export default {
  createInvitation,
  validateInvitation,
  generateAndSendEmailOtp,
  verifyInvitationOtp,
  markUsed,
  sendInvitationEmail,
};
