const Invitation = require('../models/Invitation');
const generateInvitationCode = require('../utils/invitationCode');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const emailService = require('./emailService');
const { sendMail } = require('./emailService');
const Organization = require('../models/Organization');

async function createInvitation({ email, role, method, createdBy, organizationId,expiresInDays }) {
  const code = uuidv4().slice(0, 8);
  const invitation = new Invitation({
    invitationId: uuidv4(),
    code,
    email,
    role,
    method,
    createdBy,
    status:"pending",
    organizationId,
    expiresAt: new Date(Date.now() + (expiresInDays || 7) * 24 * 60 * 60 * 1000)
  });

  await invitation.save();
  return invitation; 
}

async function validateInvitation(invitationId, code) {
  const inv = await Invitation.findOne({ invitationId }).select('+otpHash +otpExpiresAt');
  if (!inv) throw { status: 404, message: 'Invitation not found' };
  if (inv.status !== 'pending') throw { status: 400, message: 'Invitation not available' };
  if (inv.expiresAt && inv.expiresAt < new Date()) {
    inv.status = 'expired';
    await inv.save();
    throw { status: 400, message: 'Invitation expired' };
  }
  if (inv.code && code && inv.code !== code) throw { status: 400, message: 'Invalid invitation code' };

  return inv;
}


async function generateAndSendEmailOtp(invitation) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
  const otpHash = await bcrypt.hash(otp, 12);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); 

  invitation.otpHash = otpHash;
  invitation.otpExpiresAt = otpExpiresAt;
  await invitation.save();

  await emailService.sendMail({
    to: invitation.email,
    subject: 'Your signup OTP',
    text: `Your signup code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your signup code is <b>${otp}</b>. It expires in 10 minutes.</p>`
  });

  return { sent: true };
}

async function verifyInvitationOtp(invitationId, otpPlain) {
  const inv = await Invitation.findOne({ invitationId }).select('+otpHash +otpExpiresAt');
  if (!inv) throw { status: 404, message: 'Invitation not found' };
  if (!inv.otpHash || !inv.otpExpiresAt) throw { status: 400, message: 'No OTP issued' };
  if (inv.otpExpiresAt < new Date()) throw { status: 400, message: 'OTP expired' };

  const ok = await bcrypt.compare(otpPlain, inv.otpHash);
  if (!ok) throw { status: 400, message: 'Invalid OTP' };
  return inv;
}

async function markUsed(invitationId) {
  const inv = await Invitation.findOne({ invitationId });
  if (!inv) throw { status: 404, message: 'Invitation not found' };
  inv.status = 'used';
  await inv.save();
  return inv;
}
async function sendInvitationEmail(to, subject, text, html) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  createInvitation,
  validateInvitation,
  generateAndSendEmailOtp,
  verifyInvitationOtp,
  markUsed,
  sendInvitationEmail
};
